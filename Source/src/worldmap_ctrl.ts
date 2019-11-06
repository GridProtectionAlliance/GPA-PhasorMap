import { MetricsPanelCtrl } from "grafana/app/plugins/sdk";
import TimeSeries from "grafana/app/core/time_series2";
import appEvents from 'grafana/app/core/app_events';

import * as _ from "lodash";
import DataFormatter from "./data_formatter";
import "./css/worldmap-panel.css";
import $ from "jquery";
import "./css/leaflet.css";
import WorldMap from "./worldmap";

const panelDefaults = {
  maxDataPoints: 1,
  mapCenter: "(0°, 0°)",
  mapCenterLatitude: 0,
  mapCenterLongitude: 0,
  initialZoom: 1,
  valueName: "total",
  circleMinSize: 2,
  circleMaxSize: 30,
  locationData: "countries",
  thresholds: "0,10",
  colors: [
    "rgba(245, 54, 54, 0.9)",
    "rgba(237, 129, 40, 0.89)",
    "rgba(50, 172, 45, 0.97)"
    ],

    secondarythresholds: "0,10",
    secondarycolors: [
        "rgba(245, 54, 54, 0.9)",
        "rgba(237, 129, 40, 0.89)",
        "rgba(50, 172, 45, 0.97)"
    ],


  unitSingle: "",
  unitPlural: "",
  showLegend: true,
  mouseWheelZoom: false,
  esMetric: "Count",
  decimals: 0,
  hideEmpty: false,
  hideZero: false,
    stickyLabels: false,
    constantLabels: false,
  tableQueryOptions: {
    queryType: "geohash",
    geohashField: "geohash",
    latitudeField: "latitude",
    longitudeField: "longitude",
    metricField: "metric"
    },
    mapBackground: "CartoDB Dark",
    popupstring: '{PointTag}',
    customlayers: [],
    featureType: "circles",
};

const mapCenters = {
  "(0°, 0°)": { mapCenterLatitude: 0, mapCenterLongitude: 0 },
  "North America": { mapCenterLatitude: 40, mapCenterLongitude: -100 },
  "Europe": { mapCenterLatitude: 46, mapCenterLongitude: 14 },
  "West Asia": { mapCenterLatitude: 26, mapCenterLongitude: 53 },
  "SE Asia": { mapCenterLatitude: 10, mapCenterLongitude: 106 },
  "Last GeoHash": { mapCenterLatitude: 0, mapCenterLongitude: 0 }
};

export default class WorldmapCtrl extends MetricsPanelCtrl {
  static templateUrl = "partials/module.html";

  dataFormatter: DataFormatter;
  locations: any;
  staticLayerContent: any;
  tileServer: string;
  saturationClass: string;
  map: any;
  series: any;
  data: any;
  mapCenterMoved: boolean;
    customlayerData: any;

  /** @ngInject **/
  constructor($scope, $injector, contextSrv) {
    super($scope, $injector);

    this.setMapProvider(contextSrv);
    _.defaults(this.panel, panelDefaults);

    this.dataFormatter = new DataFormatter(this);

    this.events.on("init-edit-mode", this.onInitEditMode.bind(this));
    this.events.on("data-received", this.onDataReceived.bind(this));
    this.events.on("panel-teardown", this.onPanelTeardown.bind(this));
    this.events.on("data-snapshot-load", this.onDataSnapshotLoad.bind(this));

      this.loadLocationDataFromFile();
      this.customlayerData = {};
  }

    setNewMapBackground() {
        this.tileServer = this.panel.mapBackground;
        this.setMapSaturationClass();
        this.map.updateBaseLayer();
        this.render();
    }

    setMapProvider(contextSrv) {
        if (this.panel.mapBackground) {
            this.tileServer = this.panel.mapBackground;
        }
        else {
            this.tileServer = "CartoDB Dark";
        }
        this.setMapSaturationClass();
        
        this.render();
  }

  setMapSaturationClass() {
    if (this.tileServer === "CartoDB Dark") {
      this.saturationClass = "map-darken";
    } else {
      this.saturationClass = "";
    }
  }

  loadLocationDataFromFile(reload?) {
    if (this.map && !reload) {
      return;
    }

    if (this.panel.snapshotLocationData) {
      this.locations = this.panel.snapshotLocationData;
      return;
    }

    if (this.panel.locationData === "jsonp endpoint") {
      if (!this.panel.jsonpUrl || !this.panel.jsonpCallback) {
        return;
      }

      $.ajax({
        type: "GET",
        url: this.panel.jsonpUrl + "?callback=?",
        contentType: "application/json",
        jsonpCallback: this.panel.jsonpCallback,
        dataType: "jsonp",
        success: res => {
          this.locations = res;
          this.render();
        }
      });
    } else if (this.panel.locationData === "json endpoint") {
      if (!this.panel.jsonUrl) {
        return;
      }

      $.getJSON(this.panel.jsonUrl).then(res => {
        this.locations = res;
        this.render();
      });
    } else if (this.panel.locationData === "table") {
      // .. Domap nothing
    } else if (this.panel.locationData === "OpenHistorian") {
        // Added Open Historian Connection
        this.render();

    } else if (
      this.panel.locationData !== "geohash" &&
      this.panel.locationData !== "json result"
    ) {
      $.getJSON(
        "public/plugins/grafana-worldmap-panel/data/" +
          this.panel.locationData +
          ".json"
      ).then(this.reloadLocations.bind(this));
    }
  }

  reloadLocations(res) {
    this.locations = res;
    this.refresh();
  }

  showTableGeohashOptions() {
    return (
      this.panel.locationData === "table" &&
      this.panel.tableQueryOptions.queryType === "geohash"
    );
  }

  showTableCoordinateOptions() {
    return (
      this.panel.locationData === "table" &&
      this.panel.tableQueryOptions.queryType === "coordinates"
    );
  }

  onPanelTeardown() {
    if (this.map) {
      this.map.remove();
    }
  }

  onInitEditMode() {
    this.addEditorTab(
      "Worldmap",
      "public/plugins/grafana-worldmap-panel/partials/editor.html",
      2
    );
  }

  onDataReceived(dataList) {
    if (!dataList) {
      return;
    }

    this.UpdateCustomDynamicLayer();

    try {
      if (this.dashboard.snapshot && this.locations) {
        this.panel.snapshotLocationData = this.locations;
      }

      const data = [];

      if (this.panel.locationData === "geohash") {
        this.dataFormatter.setGeohashValues(dataList, data);
      } else if (this.panel.locationData === "table") {
        const tableData = dataList.map(DataFormatter.tableHandler.bind(this));
        this.dataFormatter.setTableValues(tableData, data);
      } else if (this.panel.locationData === "json result") {
        this.series = dataList;
        this.dataFormatter.setJsonValues(data);
      } else if (this.panel.locationData === "OpenHistorian") {
          this.series = dataList;
          this.dataFormatter.setOpenHistorian(data);
      } else {
        this.series = dataList.map(this.seriesHandler.bind(this));
        this.dataFormatter.setValues(data);
      }
      this.data = data;

        this.updateThresholdData();
        this.updateSecondaryThresholdData();

      if (this.data.length && this.panel.mapCenter === "Last GeoHash") {
        this.centerOnLastGeoHash();
      } else {
        this.render();
      }
    } catch (err) {
      appEvents.emit('alert-error', ['Data error', err.toString()])
    }
  }

  centerOnLastGeoHash() {
    const last: any = _.last(this.data);
    mapCenters[this.panel.mapCenter].mapCenterLatitude = last.locationLatitude;
    mapCenters[this.panel.mapCenter].mapCenterLongitude =
      last.locationLongitude;
    this.setNewMapCenter();
  }

  onDataSnapshotLoad(snapshotData) {
    this.onDataReceived(snapshotData);
  }

  seriesHandler(seriesData) {
    const series = new TimeSeries({
      datapoints: seriesData.datapoints,
      alias: seriesData.target
    });

    series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);
    return series;
  }

  setNewMapCenter() {
    if (this.panel.mapCenter !== "custom") {
      this.panel.mapCenterLatitude =
        mapCenters[this.panel.mapCenter].mapCenterLatitude;
      this.panel.mapCenterLongitude =
        mapCenters[this.panel.mapCenter].mapCenterLongitude;
    }
    this.mapCenterMoved = true;
    this.render();
  }

  setZoom() {
    this.map.setZoom(this.panel.initialZoom || 1);
  }

  toggleLegend() {
    if (!this.panel.showLegend) {
      this.map.removeLegend();
    }
    this.render();
  }

  toggleMouseWheelZoom() {
    this.map.setMouseWheelZoom();
    this.render();
  }

    toggleStickyLabels() {
        this.map.clearFeatures();
    this.render();
  }

    toggleConstantLabels() {
    this.map.clearFeatures();
    this.render();
    }

    setfeaturetype() {
        //This will be where we handle other stuff

    }

  changeThresholds() {
    this.updateThresholdData();
    this.map.legend.update();
    this.render();
  }

  updateThresholdData() {
    this.data.thresholds = this.panel.thresholds.split(",").map(strValue => {
      return Number(strValue.trim());
    });
    while (_.size(this.panel.colors) > _.size(this.data.thresholds) + 1) {
      // too many colors. remove the last one.
      this.panel.colors.pop();
    }
    while (_.size(this.panel.colors) < _.size(this.data.thresholds) + 1) {
      // not enough colors. add one.
      const newColor = "rgba(50, 172, 45, 0.97)";
      this.panel.colors.push(newColor);
    }
  }

    changeSecondaryThresholds() {
        this.updateSecondaryThresholdData();
        this.render();
    }

    updateSecondaryThresholdData() {
        
        this.data.secondarythresholds = this.panel.secondarythresholds.split(",").map(strValue => {
            return Number(strValue.trim());
        });
        while (_.size(this.panel.secondarycolors) > _.size(this.data.secondarythresholds) + 1) {
            // too many colors. remove the last one.
            this.panel.secondarycolors.pop();
        }
        while (_.size(this.panel.secondarycolors) < _.size(this.data.secondarythresholds) + 1) {
            // not enough colors. add one.
            const newColor = "rgba(50, 172, 45, 0.97)";
            this.panel.secondarycolors.push(newColor);
        }
    }

  changeLocationData() {
    this.loadLocationDataFromFile(true);

    if (this.panel.locationData === "geohash") {
      this.render();
    }
    }

    AddCustomLayer() {
        this.panel.customlayers.push({ name: "Custom Layer " + this.panel.customlayers.length, link: "", dynamic: true, usercontrolled: false});
        this.UpdateCustomLayer();
    }

    RemoveCustomLayer(id) {
        let name = this.panel.customlayers[id].name;
        this.panel.customlayers.splice(id, 1);
        delete this.customlayerData[name];
        this.UpdateCustomLayer();
       
    }

    UpdateCustomLayer() {
        let promisedata: Promise<void>[] = [];

        this.customlayerData = {};

        var promiseCtrl = this;
        this.panel.customlayers.forEach(layer => {
            if (layer.link) {
                promisedata.push(
                    $.getJSON(layer.link).then(res => {
                        
                        if (promiseCtrl.customlayerData[layer.name]) {

                            promiseCtrl.customlayerData[layer.name].data = res;
                            promiseCtrl.customlayerData[layer.name].usercontrolled = layer.usercontrolled;
                        }
                        else {
                            promiseCtrl.customlayerData[layer.name] = { data: res, usercontrolled: layer.usercontrolled};
                        }
                    })
                );
            }
        });

        

        Promise.all(promisedata).then(function () {
            promiseCtrl.render();
            promiseCtrl.map.updateStaticLayer();
        });
    }

    UpdateCustomDynamicLayer() {
        let promisedata: Promise<void>[] = [];

        var promiseCtrl = this;
        this.panel.customlayers.forEach(layer => {
            if (layer.link && layer.dynamic) {
                let layerlink = layer.link;
                if (this.data && this.data.newestTS) {
                    layerlink = layerlink.replace(/{LatestTS}/gi, (new Date(this.data.newestTS)).toUTCString());
                }
                if (this.data && this.data.oldestTS) {
                    layerlink = layerlink.replace(/{OldestTS}/gi, (new Date(this.data.oldestTS)).toUTCString());
                }
                
                promisedata.push(
                    $.getJSON(layerlink).then(res => {
                        if (promiseCtrl.customlayerData[layer.name]) {

                            promiseCtrl.customlayerData[layer.name].data = res;
                            promiseCtrl.customlayerData[layer.name].usercontrolled = layer.usercontrolled;
                        }
                        else {
                            promiseCtrl.customlayerData[layer.name] = { data: res, usercontrolled: layer.usercontrolled};
                        }
                    })
                );
            }
        });

        
        Promise.all(promisedata).then(function () {
            promiseCtrl.render();
            promiseCtrl.map.updateStaticLayer();
        });

    }

  link(scope, elem, attrs, ctrl) {
    let firstRender = true;

    ctrl.events.on("render", () => {
      render();
      ctrl.renderingCompleted();
    });

     function render() {
      if (!ctrl.data) {
        return;
      }

      // delay first render as the map panel sizing is bugged first render even though the element has correct height
      if (firstRender) {
        firstRender = false;
        setTimeout(render, 100);
        return;
      }

      const mapContainer = elem.find(".mapcontainer");

      if (mapContainer[0].id.indexOf("{{") > -1) {
        return;
      }

      if (!ctrl.map) {
        const map = new WorldMap(ctrl, mapContainer[0]);
        map.createMap();
        ctrl.map = map;
        ctrl.map.updateStaticLayer();
            
        
      }

         
      ctrl.map.resize();

      if (ctrl.mapCenterMoved) {
        ctrl.map.panToMapCenter();
      }

      if (!ctrl.map.legend && ctrl.panel.showLegend) {
        ctrl.map.createLegend();
      }

      ctrl.map.drawFeatures();
    }
  }
}
