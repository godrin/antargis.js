require 'pp'

class V4
  def initialize(x,y,z,v)
    @m=[x,y,z,v||1]
  end
  def [](i)
    @m[i]
  end

  def entries
  end

  def to_3
    [@m[0]/@m[3],
    @m[1]/@m[3],
    @m[2]/@m[3]]
  end

  def inverseRotate(m)
    V4.new(
      @m[0]*m[0,0] + @m[1]*m[0,1] + @m[2]*m[0,2],
      @m[0]*m[1,0] + @m[1]*m[1,1] + @m[2]*m[1,2],
      @m[0]*m[2,0] + @m[1]*m[2,1] + @m[2]*m[2,2],
      1
    )
  end

  def inverseTranslate(m)
    V4.new(
      @m[0]-m[3,0],
      @m[1]-m[3,1],
      @m[2]-m[3,2],
      1
    )
  end
end

class M4
  def initialize(m=nil)
    @m=m||[
      [1,0,0,0],
      [0,1,0,0],
      [0,0,1,0],
      [0,0,0,1]]
  end

  def translation=(p)
    3.times{|i|@m[3][i]=p[i]}
    self
  end
  def rotation=(angles)
    cr = Math::cos( angles[0] );
    sr = Math::sin( angles[0] );
    cp = Math::cos( angles[1] );
    sp = Math::sin( angles[1] );
    cy = Math::cos( angles[2] );
    sy = Math::sin( angles[2] );

    @m[0][0]= cp*cy 
    @m[0][1]= cp*sy
    @m[0][2]= -sp
    srsp = sr*sp;
    crsp = cr*sp;

    @m[1][0]= srsp*cy-cr*sy
    @m[1][1]= srsp*sy+cr*cy
    @m[1][2]= sr*cp

    @m[2][0]= crsp*cy+sr*sy
    @m[2][1]= crsp*sy-sr*cy
    @m[2][2]= cr*cp
    self
  end
  def [](a,b)
    @m[a][b]
  end
  def *(m)
    n=M4.new
    4.times{|x|
      4.times{|y|
        n[x,y]=self[0,y]*m[x,0]+
          self[1,y]*m[x,1]+
          self[2,y]*m[x,2]+
          self[3,y]*m[x,3]
      }
    }
    n
  end
end

id=M4.new([
  [1,0,0,0],
  [0,1,0,0],
  [0,0,1,0],
  [0,0,0,1]
])
x=M4.new([
  [1,2,3,4],
  [0,1,0,5],
  [0,0,8,0],
  [0,0,0,1]
])

y=M4.new
y.rotation=[3.14*0.5,0,0]
#y.translation=[1,2,3]
#v=V4.new(0,0,0,1)
#t=v.inverseTranslate(y)
#pp y,y.t,y*y.t

#t=t.inverseRotate(y)


#pp t,y
