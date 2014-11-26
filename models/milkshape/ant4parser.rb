#!/bin/bash

module Antargis

  class Reader
    def initialize(data)
      @data=data
    end
    def sint32
      get(4).unpack("l")[0]
    end
    def uint32
      get(4).unpack("V")[0] ## ??????
    end
    def uint16
      get(2).unpack("v")[0]
    end
    def vec2
      [float,float]
    end
    def vec3
      [float,float,float]
    end
    def vec4
      [float,float,float,float]
    end
    def float
      get(4).unpack("e")[0]
    end
    def get(count)
      rest=@data[0..count]
      @data=@data[count..-1]
      rest
    end
  end

  class Parser < Reader

    #Vertex=Struct.new(:x, :y, :z, :tx, :ty, :boneId, :nx, :ny, :nz)
    def parse(filename)
      vertices=[]
      normals=[]
      triangles=[]
      bones=[]

      (vertexCount=uint32).times do
        vertices<<Milkshape::Vertex.new(0,float,float,float,
                                        float,1-float,
                                        (uint32)&0xFFFFFFFF)
        normals<<Milkshape::Normal.new(float,float,float)
      end

      (trianlgeCount=uint32).times do
        a,b,c=uint32,uint32,uint32
        triangles << Milkshape::Triangle.new(0,a,b,c,a,b,c,0)
      end
      frameCount=uint32
      (bonesCount=uint32).times do |i|
        x,y,z=float,float,float
        rx,ry,rz=float,float,float
        parent=uint32
        ts=[]
        rs=[]
        (frames=uint32).times do
          rs<<Milkshape::Keyframe.new(float,float,float,float)
        end
        (frames=uint32).times do
          ts<<Milkshape::Keyframe.new(float,float,float,float)
        end
        bones << Milkshape::Bone.new("bone#{i}","bone#{parent}",Milkshape::BoneConfig.new(0,x,y,z,rx,ry,rz),
                                     Milkshape::Keyframes.new(ts,rs)) 
      end

      Milkshape::Scene.new(
        Milkshape::Head.new(frameCount,0),
        [Milkshape::Mesh.new("mainmesh", vertices, normals, triangles)],
        [Milkshape::Material.new("defaultMaterial",[1,1,1],[1,1,1],[0,0,0],[0,0,0],0,0,filename.gsub(/\.ant4/,".png").gsub(/.*\//,""),1)],
        bones
      )
    end
  end

end
