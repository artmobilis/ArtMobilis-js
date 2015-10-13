document.addEventListener('DOMContentLoaded', function () {
    // replace "toner" here with "terrain" or "watercolor"
    //var layer = new L.StamenTileLayer("watercolor");
    //var map = new L.Map("element_id", {
    //    center: new L.LatLng(43.6048, 7.1418),
    //    zoom: 12
    //});
    //map.addLayer(layer);
    var distanceMax = 100; //km

    var target = { "name": "CASA", "latitude": 43.6048, "longitude": 7.1418 };

    var status = document.querySelector("#status");
    var infos = document.querySelector("#infos");

    var map = new L.Map("watercolor", {
        center: new L.LatLng(43.6048, 7.1418),
        zoom: 10
    });
    map.addLayer(new L.StamenTileLayer("watercolor", {
        detectRetina: true
    }));
    //target marker 
    var targetMarker = L.marker([target.latitude, target.longitude]);
    targetMarker.bindPopup(target.name);
    targetMarker.addTo(map);

    //target  circle
    var targetCircle = L.circle([target.latitude, target.longitude], distanceMax * 1000, { fillColor: "green", color: "green" });
    targetCircle.addTo(map);

    //marker
    var marker = L.marker([0, 0]);
    marker.bindPopup("Moi.");
    marker.addTo(map);

    //accuracy circle
    var circle = L.circle([0, 0], 0);
    circle.bindPopup("Precision.");
    circle.addTo(map);

    function processPosition(event) {
        status.innerHTML = "Lat : " + event.coords.latitude + "° Long : " + event.coords.longitude + "° Précision : " + event.coords.accuracy + "m.";
        var coords = [event.coords.latitude, event.coords.longitude];

        marker.setLatLng(coords);
        circle.setLatLng(coords);
        circle.setRadius(event.coords.accuracy);

        if (!map.getBounds().contains(coords)) {
            map.panTo(coords);
        }

        var distanceTarget = geoDistance(target.latitude, target.longitude, event.coords.latitude, event.coords.longitude);
        //distanceTarget = round(distanceTarget);

        infos.innerHTML = "Distance de " + target.name + " : " + distanceTarget + "km.";

        if (distanceTarget < distanceMax) {
            infos.innerHTML += "<span class='win'>A côté</span>";
        }
    }

    function errorPosition() {
        status.innerHTML = "Position non définie.";
        marker.setLatLng([0, 0]);
        map.setView([0, 0], 3);
    }

    //location notifications
    var options = { "enableHighAccuracy": true, "maximumAge": 0, "timeout": Infinity };
    navigator.geolocation.watchPosition(processPosition, errorPosition, options);

});