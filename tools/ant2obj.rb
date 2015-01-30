#!/usr/bin/env ruby
require 'pp'

filename=ARGV[0]

data=File.open(ARGV[0],"rb"){|f|
  f.read
}

class Reader
  def initialize(data)
    @data=data
  end
  def uint16
    get(2).unpack("S")[0]
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
    o=@data
    @data=@data[count..-1]
    rest
  end
end

r=Reader.new(data)

m=r.uint16
puts "#MESHES :#{m}"
Vertex=Struct.new(:v,:n,:c,:t)
groups=[]
vertices=[]
puts "mtllib something.mtl"  
puts "o something"
i=0
(1..m).each{|meshIndex|
  faceCount=r.uint16
  faces=[]
  (1..faceCount).each{|fc|
    face=[]
    vcount=r.uint16
    if vcount>4
      raise "impossible"
    end
    (1..vcount).each{|vc|

      v=r.vec3
      n=r.vec3
      c=r.vec3
      t=r.vec2
      vertices<<Vertex.new(v,n,c,t)
      i+=1
      face<<i
    }
    faces<<face

  }
  groups<<faces
}
vertices.each{|v| puts "v #{v.v[0]} #{v.v[1]} #{v.v[2]}" }
vertices.each{|v| puts "vt #{v.t[0]} #{v.t[1]}" }
vertices.each{|v| puts "vn #{v.n[0]} #{v.n[1]} #{v.n[2]}" }

groups.each_with_index{|g,i|
  puts "g something#{i}"
  puts "usemtl material#{i}"
  g.each{|f| puts "f #{f.map{|v|"#{v}/#{v}/#{v}"}.join(" ")}"}

}
