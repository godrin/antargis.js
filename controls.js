define([],function() {

  var mousedown=false;
  var ox,oy;
  return {
    init:function(options) {

      $(document).mouseup(function(e) {
        mousedown=false;
      });
      $(document).mousedown(function(e) {
        mousedown=true;
        ox=e.pageX;
        oy=e.pageY;
      });

      $(document).mousemove(function(e) {
        e.preventDefault();
        e.stopPropagation();
        if(mousedown) {
          if(options && options.move)
            options.move({dx:e.pageX-ox, dy:e.pageY-oy});

          ox=e.pageX;
          oy=e.pageY;
        }
      });

      $(document).keydown(function(e) {
        console.log("KEYD",e);
      });

    }
  };
});
