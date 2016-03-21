angular.module('data')

.factory('Journey', function() {
  var Journey = function() {
    var that = this;

    var _pois = [];
    var _name = '';

    var _loading = false;
    var _on_load;
    var _on_error;

    var _root;

    var _json_loader = new AM.JsonLoader();


    this.Load = function(url, on_load, on_error) {
      if (_loading) {
        on_error('loading');
        return;
      }

      _loading = true;
      var loader = new AM.JsonLoader();

      loader.Load(url, function() {
        _loading = false;
        that.Parse(loader.json, on_load, on_error);
      }, function() {
        _loading = false;
        if (on_error) on_error(url);
        if (on_load) on_load();
      });
    };

    function LoadFileRec(list) {
      if (list.length != 0) {

        var url = list.pop();

        _json_loader.Load(_root + url, function() {

          var json = _json_loader.json;
          _pois.push( {
            uuid: json.uuid,
            name: json.name || 'unnamed',
            latitude: json.latitude || 0,
            longitude: json.longitude || 0,
            radius: json.radius || 10,
            channels: json.channels || [],
            landmark: json.landmark
          } );
          LoadFileRec(list);

        }, function() {

          _on_error(url);
          LoadFileRec(list);

        });
      }
      else {
        _loading = false;
        if (_on_load) _on_load();
      }
    }

    this.Parse = function(json, on_load, on_error) {
      if (_loading)
        return;

      _loading = true;
      _on_load = on_load;
      _on_error = on_error;

      _pois.length = 0;
      _name = '';

      if (json.name) _name = json.name;

      _root = (json.POIs_root) ? json.POIs_root + '/' : '';

      if (json.POIs) {
       LoadFileRec(json.POIs);
      }
    };

    this.GetName = function() {
      return _name;
    };

    this.GetPOIs = function() {
      return _pois;
    };

    this.IsLoading = function() {
      return _loading;
    };


  }

  return Journey;


})
