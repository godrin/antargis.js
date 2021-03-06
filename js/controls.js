// deprecated - to be included into ng_game
define([],function() {
alert("CONtroLS");
  var mousedown=false;
  var containerWidth, containerHeight;
  var ox,oy;
  var moves=0;

  function updateSize() {
    // FIXME: remove global reference to canvas
    containerWidth = $("canvas").width();
    containerHeight = $("canvas").height();
  }

  updateSize();

  return {
    init:function(el, options) {

      $(el).mouseup(function(e) {
        mousedown=false;
      });
      $(el).mousedown(function(e) {
        mousedown=true;
        ox=e.pageX;
        oy=e.pageY;
        moves=0;
      });
      $(el).click(function(e) {
        console.log("CLICK",e);
        if(options && options.click && moves<4)
          options.click(e);
      });

      $(el).mousemove(function(e) {
        e.preventDefault();
        e.stopPropagation();
        moves+=1;
        if(mousedown) {
          if(options && options.move)
            options.move({dx:e.pageX-ox, dy:e.pageY-oy});

          ox=e.pageX;
          oy=e.pageY;
        }
        if(options && options.hover)
          options.hover({
            x:e.pageX,
            y:e.pageY, 
            rx:e.pageX/containerWidth*2-1,
            ry:-e.pageY/containerHeight*2+1,
          });
      });

      $(document).keydown(function(e) {
        if(options && options.keydown)
          return options.keydown({keyCode:e.keyCode,e:e},e);
        console.log("KEYD",e);
      });

      $(window).resize(function(e) {
        updateSize();

        if(options && options.resize)
          options.resize({width:containerWidth, height: containerHeight });

      });
      updateSize();

    }
  };
});
