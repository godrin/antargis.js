define(["mixins/formations/base.js"],function(Base) {

  var lines=[10,14,20,40,100];

  var restForm=function() {
    Base.apply(this,arguments);

    /*
    var center=boss.position;


    i  // virtual positions as map from man to pair of [row,line (circle)]
    std::map<AntPerson*,std::pair<size_t,size_t> >  vpos;
    relative positions to hero pos
    std::map<AntPerson*,AGVector2> rpos;

    std::vector<AntPerson*> men=getSortedMen();

    std::map<size_t,size_t> linesizes;
    size_t line=1;
    size_t row=0;
    for (std::vector<AntPerson*>::iterator menIterator=men.begin();menIterator!=men.end();menIterator++)  {
    vpos[*menIterator]=std::make_pair(row,line);
    linesizes[line]++;
    row+=1;
    if (row>getRowsOfLine(line)) { // add check for new weapon group here
    row-=getRowsOfLine(line);
    line+=1;
    }
    }
    for (std::vector<AntPerson*>::iterator menIterator=men.begin();menIterator!=men.end();menIterator++)  {
    std::map<AntPerson*,std::pair<size_t,size_t> >::iterator  curvpos=vpos.find(*menIterator);
    size_t row=curvpos->second.first,line=curvpos->second.second;
    float radius=line*1.2;
    float angle=((float)row)/linesizes[line]*M_PI*2.0;
    rpos[*menIterator]=AGVector2(cos(angle)*radius,sin(angle)*radius)+displacement;
    }
    rpos[dynamic_cast<AntPerson*>(getBoss()->getEntity())]=displacement;
    return rpos;
    */            
  };
  restForm.prototype=Base;

  return restForm;
});
