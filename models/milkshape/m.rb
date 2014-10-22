require 'pp'

class V4
  def initialize(x,y,z,v=1)
    @m=[x,y,z,v]
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

  def to_quat

    heading,attitude,bank=to_3.reverse
    #      // Assuming the angles are in radians.
    c1 = Math.cos(heading/2)
    s1 = Math.sin(heading/2)
    c2 = Math.cos(attitude/2)
    s2 = Math.sin(attitude/2)
    c3 = Math.cos(bank/2)
    s3 = Math.sin(bank/2)
    c1c2 = c1*c2
    s1s2 = s1*s2
    w =c1c2*c3 - s1s2*s3
    x =c1c2*s3 + s1s2*c3
    y =s1*c2*c3 + c1*s2*s3
    z =c1*s2*c3 - s1*c2*s3
    [x,y,z,w] 
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

