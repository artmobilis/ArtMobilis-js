angular.module('starter')

.controller('TrackingViewCtrl',
  function(
    $scope,
    $state,
    $timeout,
    JourneyManagerSvc,
    JourneySceneSvc,
    LoadingSvc,
    AssetsLoadingSvc) {
  $scope.footer_title = '';

  $scope.run = { value: false };

  $scope.hide_switch_mode_button = false;
  $scope.switch_mode_button_name = '';

  var _destroyed = false;

  AssetsLoadingSvc.Load();
  JourneySceneSvc.DetectionUseFixedAngle(true);
  JourneySceneSvc.Start(true);

  if (LoadingSvc.IsLoading()) {
    $state.go('loading', { next_state: 'tracking' } );
    return;
  }

  $scope.run.value = true;

  function ShowSwitchModeButton(bool) {
    $scope.hide_switch_mode_button = !bool;
  }

  function SetSwitchButtonToExit(bool) {
    if (bool) {
      $scope.switch_mode_button_name = 'Exit POI';
    }
    else {
      $scope.switch_mode_button_name = 'Enter POI';
    }
  }

  function SetFooterTitle(str) {
    $scope.footer_title = str;
  }

  function OnJourneyModeChange() {
    $timeout(function() {
      if (_destroyed)
        return;
      
      var mode = JourneyManagerSvc.GetMode();

      switch (mode) {

        case JourneyManagerSvc.MODE_NAVIGATION:
          SetFooterTitle('Navigation');
          ShowSwitchModeButton(false);
        break;

        case JourneyManagerSvc.MODE_POI:
          SetSwitchButtonToExit(true);
          ShowSwitchModeButton(true);
          var poi = JourneyManagerSvc.GetCurrentPOI();
          SetFooterTitle('POI: ' + poi.name);
        break;

        case JourneyManagerSvc.MODE_NAVIGATION_FORCED:
          SetSwitchButtonToExit(false);
          ShowSwitchModeButton(true);
          SetFooterTitle('Navigation');
        break;
      }
    });
  }

  $timeout(OnJourneyModeChange);

  document.addEventListener('journey_mode_change', OnJourneyModeChange, false);

  $scope.$on('$destroy', function() {
    _destroyed = true;
    document.removeEventListener('journey_mode_change', OnJourneyModeChange, false);
    JourneySceneSvc.Stop();
  });

  $scope.SwitchMode = function() {
    if (JourneyManagerSvc.GetMode() == JourneyManagerSvc.MODE_POI) {
      JourneyManagerSvc.ForceNavigationMode(true);
    }
    else {
      JourneyManagerSvc.ForceNavigationMode(false);
    }
  };
})