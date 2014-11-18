#!/usr/bin/env ruby

require 'pp'
require 'json'
require_relative './m.rb'
require_relative './ant4parser.rb'
  
module Milkshape
  # simple regex for decimal fractions
  NUM="[+-]?[0-9]+\\.?[0-9]*"

  # use 35 frames per seconds as default 
  FPS=1 #30.0

  ## ms3d-txt format data structures
  # complete file
  Scene=Struct.new(:head, :meshes, :materials, :bones)
  # frameCount and currentFrame
  Head=Struct.new(:frameCount, :frame)
  Mesh=Struct.new(:name, :vertices, :normals, :triangles)
  Vertex=Struct.new(:flags, :x, :y, :z, :u, :v, :bone)
  Normal=Struct.new(:x, :y, :z)
  Triangle=Struct.new(:flags, :a, :b, :c, :na, :nb, :nc, :group)
  Material=Struct.new(:name, :ambient, :diffuse, :specular, :emissive, :shinines, :transparency, :color, :alpha)
  Bone=Struct.new(:name, :parent, :config, :frames, :relative)
  BoneConfig=Struct.new(:flags, :posx, :posy, :posz, :rotx, :roty, :rotz)
  Keyframes=Struct.new(:pos, :rot)
  Keyframe=Struct.new(:time, :x, :y, :z)
  
  # some functions to make access to these structures easier
  class Vertex
    def pos
      V4.new(x,y,z)
    end
  end
  class Bone
    def pos
      V4.new(config.posx,config.posy,config.posz)
    end
    def rot
      V4.new(config.rotx,config.roty,config.rotz)
    end
  end
  class Keyframe
    def vec
      V4.new(x,y,z)
    end
  end

  class Parser
    public
    def parse(&block)
      @block=block
      Scene.new(head,
                meshes,
                materials,
                bones
               )
    end
    private
    def next_line
      @block.yield
    end
    def scan(pattern)

      line=next_line until line=~pattern
      $~[1..-1]
    end

    def scanCount(name=nil)
      if name
        scan(/^#{name}: (#{NUM})$/)[0].to_i
      else
        scan(/^(#{NUM})$/)[0].to_i
        end
    end

    def scanNumbers(count)
      scan(/#{(["("+NUM+")"]*count).join(" ")}/).map{|s|s.to_f}
    end

    def head
      Head.new(scanCount("Frames"), scanCount("Frame"))
    end

    def meshes
      (0...scan(/Meshes: ([0-9]+)/)[0].to_i).map{
        Mesh.new(meshName,vertices,normals,triangles)
      }
    end

    def string
      scan(/"(.*)"/)[0]
    end

    def meshName
      scan(/"(.*)" #{NUM} #{NUM}/)[0]
    end

    def vertices
      (0...scanCount).map{
        Vertex.new(*scanNumbers(7))
      }
    end

    def normals
      (0...scanCount).map{
        Normal.new(*scanNumbers(3))
      }
    end

    def triangles
      (0...scanCount).map{
        Triangle.new(*scanNumbers(8))
      }
    end

    def materials
      mats = scanCount("Materials")
      (0...mats).map{
        Material.new(string, *materialData, string, string)
      }
    end

    def materialData
      (0...4).map{scanNumbers(4)}+
        (0...2).map{scanNumbers(1)}
    end

    def bones
      (0...scanCount("Bones")).map{
        bone
      }
    end
    def bone
      Bone.new(string,string,boneConfig,keyframes)
    end
    def boneConfig
      BoneConfig.new(*scanNumbers(7))
    end
    def keyframes
      Keyframes.new(
        (0...scanCount).map{
          Keyframe.new(*scanNumbers(4))
        },
        (0...scanCount).map{
          Keyframe.new(*scanNumbers(4))
        }
      )
    end
  end
end

module Milkshape

  LocalFrame=Struct.new(:time, :pos, :rot)

  class Scene
    def makeRelativeBones
      self.bones.each{|bone|
        m=M4.new
        m.rotation=[bone.config.rotx,bone.config.roty,bone.config.rotz]
        m.translation=[-bone.config.posx,-bone.config.posy,-bone.config.posz]
        bone.relative=m
      }
    end

    def to_3
      makeRelativeBones

      vCount=0
      nCount=0

      {
        "metadata"=>{
          "formatVersion" => 3.0,
          "sourceFile"    => ARGV[0],
          "generatedBy"   => "MilkshapeConverter",
          "vertices"      => meshes.map{|mesh|mesh.vertices}.flatten.length,
          "faces"         => meshes.map{|mesh|mesh.triangles}.flatten.length,
          "normals"       => meshes.map{|mesh|mesh.normals}.flatten.length,
          "uvs"           => meshes.map{|mesh|mesh.vertices}.flatten.length,
          "colors"        => 0,
          "materials"     => self.materials.length,
          "bones"         => self.bones.length,
        },
        "influencesPerVertex"=>1,
        "materials"=>self.materials.map{|mat|mat.to_3},
        # there are no groups in 3's json format, so join vertices
        "vertices" =>self.meshes.map{|mesh|mesh.vertices.map{|v| v.pos.to_3 }}.flatten,
        "normals" =>self.meshes.map{|mesh|mesh.normals.map{|v|[v.x,v.y,v.z]}}.flatten,
        # switch v coordinate
        "uvs" =>[self.meshes.map{|mesh|mesh.vertices.map{|v|[v.u, 1-v.v]}}.flatten],
        "faces" =>self.meshes.map{|mesh|
          addV=vCount
          addN=nCount
          vCount+=mesh.vertices.length
          nCount+=mesh.normals.length
          mesh.triangles.map{|v|
            [
              0x28,
              v.a.to_i+addV,
              v.b.to_i+addV,
              v.c.to_i+addV,
              v.na.to_i+addN,
              v.nb.to_i+addN,
              v.nc.to_i+addN,
              v.a.to_i+addV,
              v.b.to_i+addV,
              v.c.to_i+addV,
            ]
          }
        }.flatten,
        "bones"=> self.bones.map{|bone|
          {"parent"=>self.bones.index{|b|b.name==bone.parent}||-1,
           "name"=>bone.name,
           "scl"=>[1,1,1],
           "pos"=>bone.pos.to_3,
           "rotq"=>bone.rot.to_quat,
          }
        },
        "skinIndices"=>self.meshes.map{|mesh|mesh.vertices.map{|v|[v.bone.to_i]}}.flatten,
        "skinWeights"=>self.meshes.map{|mesh|mesh.vertices.map{1}}.flatten,
        "animation" => {
          "length" => head.frameCount/FPS,
          "hierarchy" => self.bones.map{|bone|
            # gather pos and rot frames in one data-structure
            frames=(0...bone.frames.rot.length).map{|i|LocalFrame.new(bone.frames.pos[i].time, bone.frames.pos[i].vec, bone.frames.rot[i].vec )}
            {
              "parent" => self.bones.index{|b|b.name==bone.parent}||-1,
              "keys" => frames.map{|frame|
                {
                  "time"=>frame.time/FPS,
                  # positions are not relative to bone-definition as in MS3d format, so invert
                  "pos"=>frame.pos.invert_by(bone.relative).to_3,
                  "rot"=>frame.rot.to_quat,
                  "scl"=>[1,1,1]
                }
              }
            }
          }
        },
        "colors"=>[]
      }
    end

  end
  class Material
    def to_3
      {
        "DbgColor" => 15658734, #/ => 0xeeeeee
        "DbgIndex" => 0,
        "DbgName" => self.name,
        "blending" => "NormalBlending",
        "colorAmbient" => self.ambient[0..2],
        "colorDiffuse" => self.diffuse[0..2],
        "colorSpecular" => self.specular[0..2],
        "depthTest" => true,
        "depthWrite" => true,
        "mapDiffuse" => self.color,
        "mapDiffuseWrap" => ["repeat", "repeat"],
        "shading" => "Lambert",
        "specularCoef" => 9,
        "transparency" => 0.0,
        "transparent" => true,
        "vertexColors" => false,
        #"mapDiffuse" => "man_elp.png",
        "skinning" => true
      } 
    end
  end
end

filename=ARGV[0]
if filename =~/.*txt/
  parser=Milkshape::Parser.new
  begin
    File.open(ARGV[0]){|f|
      model = parser.parse {||f.readline}
      jj model.to_3
    }
  end
elsif filename=~/.*ant4/
  data=File.open(filename,"rb"){|f|f.read}
  model=Antargis::Parser.new(data).parse(filename)
  jj model.to_3
  #pp "ANT4"
end
