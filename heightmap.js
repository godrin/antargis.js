define([],function() {

  var ArrayType = window.Float64Array || window.Array;
  var defaultOptions={
    width:256,
    height:256,
  };

  function createMap(w,h) {
    return new ArrayType(w*h);
  }

  var HeightMap=function(options) {
    this.options={};
    $.extend(this.options,defaultOptions);
    $.extend(this.options,options);

    this.map={rock:createMap(this.options.width, this.options.height)};
  };

  HeightMap.prototype.generate=function() {
    var x,y;
    var rock=this.get("rock");
    for(x=0;x<this.options.width;x++)
      for(y=0;y<this.options.height;y++) {
        var val=x*1.0/this.options.width;
        rock(x,y,val);
      }
  };

  HeightMap.prototype.get=function(type) {
    var w=this.options.width;
    var array=this.map[type];

    var fct = function(x,y,val) {
      var i=x+w*y;
      if(val)
        return array[i]=val;
      return array[i];
    };

    fct.interpolate=function(x,y) {
      var fx=Math.floor(x);
      var fy=Math.floor(y);
      var v00=this(fx  ,fy  );
      var v01=this(fx  ,fy+1);
      var v10=this(fx+1,fy  );
      var v11=this(fx+1,fy+1);
      var dx=x-fx;
      var dy=y-fy;
      return (v00*(1-dx)+v10*dx)*(1-dy)+(v01*(1-dx)+v11*dx)*dy;
    };

    return fct;
  };


  HeightMap.prototype.toThreeTerrain=function() {
    var self=this;
    return function(g,options) {
      console.log("OPTIONS",options);
      var xl = self.options.xSegments + 1,
      yl = self.options.ySegments + 1;
      var rock=self.get("rock");
      for (i = 0; i < xl; i++) {
        for (j = 0; j < yl; j++) {
          g[j * xl + i].z += rock(i,j);
        }
      }
    };
  };

  HeightMap.prototype.toCanvas = function(_type) {
    var type=_type||"rock";
    var canvas = document.createElement('canvas'),
    context = canvas.getContext('2d');
    canvas.width = this.options.width;
    canvas.height = this.options.height;
    var d = context.createImageData(canvas.width, canvas.height),
    data = d.data;
    var min,max;
    var accessor=this.get(type)
    for (var y = 0; y < this.options.height; y++) {
      for (var x = 0; x < this.options.width; x++) {
        var v=accessor(x,y);
        if(!min || min>v)
          min=v;
        if(!max || max<v)
          max=v;
      }
    }

    for (var y = 0; y < this.options.height; y++) {
      for (var x = 0; x < this.options.width; x++) {
        var i = y*this.options.height + x;
        idx = i * 4;
        data[idx] = data[idx+1] = data[idx+2] = Math.round(((accessor(x,y) - min) / (max-min)) * 255);
        data[idx+3] = 255;
      }
    }
    context.putImageData(d, 0, 0);
    return canvas;
  };

  return HeightMap;
});
