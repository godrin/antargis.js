define(["app2"], function(app) {
/*  app.directive('buttonKey', function() {
    return {
      scope:{
        key:"=buttonKey"
      },
      controller:function() {
      }
    };
  });*/
  app.directive('skipToMenu', function() {
    return  { 
      scope: {
        url:"=skipToMenu"
      },
      controller:function($element, $scope, hotkeys) {
        var e = angular.element("<div class='skip'><a href='"+$scope.url+"'>Skip&raquo;</a></div>");7
        $element.append(e);
        function finish() {
          location.hash=$scope.url;
        }
        hotkeys.bindTo($scope)
        .add({
          combo: 'esc',
          description: 'blah blah',
          callback: finish
        });
      }
    };
  });
});
