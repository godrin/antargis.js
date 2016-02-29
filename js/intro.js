define(["app2"], function(app) {
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
        })
      }
    };
  });

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

        hotkeys.bindTo($scope)
        .add({
          combo: 'esc',
          description: 'blah blah',
          callback: finish
        })

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
