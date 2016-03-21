angular.module('dataLoading')

.factory('objectFactory', [function() {

    function BuildChannelContents(channel_id, data) {

      var channel = data.channels[channel_id];
      var contents_transforms = channel.contents;

      var object = new THREE.Object3D();

      for (var i = 0, c = contents_transforms.length; i < c; ++i) {
        var transform = contents_transforms[i];

        var contents = data.contents[transform.uuid];

        if (typeof contents === 'undefined' || typeof contents.object === 'undefined')
          continue;
        var contents_mesh = data.objects[contents.object];
        if (typeof contents_mesh === 'undefined')
          continue;

        var mesh = contents_mesh.clone();

        mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
        mesh.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
        mesh.scale.multiplyScalar(transform.scale);

        object.add(mesh);
      }

      return object;
    }

    return {
      BuildChannelContents: BuildChannelContents,
      Parse: AMTHREE.ParseObject,
      ParseArray: AMTHREE.ParseObjectArray,
      Load: AMTHREE.LoadObject,
      LoadArray: AMTHREE.LoadObjectArray
    }

}])