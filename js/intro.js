define(["app2"], function(app) {

  app.directive('intro', function() {
    return  { 
      controller:function($element, $scope, hotkeys) {
        $element.addClass('page-intro');
        $scope.screen = 0;

        function finish() {
          location.hash="/menu";
        }

        function incScreen() {
          $scope.screen = $scope.screen + 1;
          if($scope.screen >= $(".screen",$element).length) {
            finish();
          } else {
            $($(".screen",$element)[$scope.screen]).show();
          }
        }
        $scope.finish = finish;

        $(".screen",$element).hide();
        $($(".screen",$element)[0]).show();

        _.each(['webkitAnimationIteration','animationiteration'],function(evName) {
          $(".screen").on(evName, function() {
            $($(".screen",$element)[$scope.screen]).hide();
            $scope.$apply(incScreen);

          });
        });
      }
    };
  });
  return {};
});
