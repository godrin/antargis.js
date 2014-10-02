#!/usr/bin/env ruby
#
# Author: David Kamphausen david.kamphausen76@gmail.com

require 'pp'

frames=nil
frame=nil
meshes=nil
mesh=nil
flags=nil
material=nil

NUM="[+-]?[0-9]+\\.?[0-9]*"
INT="[+-]?[0-9]+"

Vertex=Struct.new(:x, :y, :z, :u, :v, :bone)
Normal=Struct.new(:x, :y, :z)
Triangles=Struct.new(:a, :b, :c, :na, :nb, :nc)
Mesh=Struct.new(:vertices, :normals, :triangles)
Material=Struct.new(:name, :data)
Bone=Struct.new(:name, :parentName, :x, :y, :z, :rx, :ry, :rz, :frames)

class Parser
  def initialize
    @mode=:header
    @meshes=[]
    @vertices=[]
    @normals=[]
    @triangles=[]
    @vertexCount=0
    @materialCount=0
    @materials=[]
  end
  def parse(line)
    self.send(@mode,line)
  end

  def header(l)
    case l
    when /Frames: ([0-9]+)/
      @frames=$1.to_i
    when /Frame: ([0-9]+)/
      @frame=$1.to_i
    when /Meshes: ([0-9]+)/
      @meshCount=$1.to_i
    when /"(.*)" ([0-9]+) ([0-9]+)/
      @mode=:vertices
    end
  end

  def vertices(l)
    case l
    when /^(#{NUM})$/
      @vertexCount=$1.to_i
    when /#{(["("+NUM+")"]*7).join(" ")}/
      dummy,flags,x,y,z,u,v,b= $~.to_a
      @vertices<<Vertex.new(x,y,z,u,v,b)
      if @vertices.length==@vertexCount
        @mode=:normals
      end
    end
  end
  def normals(l)
    case l
    when /^(#{NUM})$/
      @normalCount=$1.to_i
    when /#{(["("+NUM+")"]*3).join(" ")}/
      dummy,x,y,z= $~.to_a
      @normals<<Normal.new(x,y,z)
      if @normals.length==@normalCount
        @mode=:triangles
      end
    end
  end
  def triangles(l)
    case l
    when /^(#{NUM})$/
      @triangleCount=$1.to_i
    when /#{(["("+INT+")"]*8).join(" ")}/
      a,b,c,na,nb,nc= $~.to_a
      @triangles<<Triangles.new(a,b,c,na,nb,nc)
      if @triangles.length==@triangleCount
        @meshes<<Mesh.new(@vertices,@normals,@triangles)
        @vertices=[]
        @normals=[]
        @triangles=[]
        if @meshes.length==@meshCount
          @mode=:materials
        else
          @mode=:vertices
        end
      end
    end
  end
  def materials(l)
    case l
    when /Materials: ([0-9]+)/
      @materialCount=$1.to_i
    when /"(.*)"/
      @materialName=$1
      @materialData=[]
    when /#{(["("+NUM+")"]*4).join(" ")}/,/^#{NUM}$/
      @materialData<<$~[1..-1]
      if @materialData.length==6
        @materials<<Material.new(@materialName,@materialData)
        if @materials.length==@materialCount
          @mode=:bones
        end
      end
    end
  end
  def bones(l)
    case l
    when /Bones: ([0-9]+)/
      @boneCount=$1.to_i
      @boneName=nil
      @boneParentName=nil
    when /"(.*)"/
      if @boneName
        @boneParentName=$1
      else
        @boneName=$1
      end
    when /#{(["("+NUM+")"]*6).join(" ")}/
      flags,x,y,z,rx,ry,rz = $~[1..-1]

    end
      #Bone=Struct.new(:name, :parentName, :x, :y, :z, :rx, :ry, :rz, :frames)
end

parser=Parser.new

File.open(ARGV[0]){|f|
  f.each_line{|l|
    parser.parse(l)
  }
}
pp parser
