import { MetricsPanelCtrl } from "grafana/app/plugins/sdk";
import TimeSeries from "grafana/app/core/time_series2";
import appEvents from 'grafana/app/core/app_events';

import * as _ from "lodash";
import DataFormatter from "./data_formatter";
import "./css/worldmap-panel.css";
import $ from "jquery";
import "./css/leaflet.css";
import PhasorMap from "./worldmap";
import moment from 'moment';

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
	multiMaps: false,
	selectableMaps: [{ name: "default", map: 'CartoDB Positron', forceReload: false }],
    zoomSteps: 1,
    radiusOverlap: 10,
    moveOverlap: false,
    filter: "",
};

const mapCenters = {
  "(0°, 0°)": { mapCenterLatitude: 0, mapCenterLongitude: 0 },
  "North America": { mapCenterLatitude: 40, mapCenterLongitude: -100 },
  "Europe": { mapCenterLatitude: 46, mapCenterLongitude: 14 },
  "West Asia": { mapCenterLatitude: 26, mapCenterLongitude: 53 },
  "SE Asia": { mapCenterLatitude: 10, mapCenterLongitude: 106 },
  "Last GeoHash": { mapCenterLatitude: 0, mapCenterLongitude: 0 }
};

const mapOption = ['CartoDB Positron', 'CartoDB Dark', 'Open Topo Map', 'OpenStreetMap', 'Esri NatGeo','Esri WorldShaded','Esri WorldShaded'];

export default class PhasorMapCtrl extends MetricsPanelCtrl {
	static templateUrl = "partials/module.html";
	mapOptions = mapOption;
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

    if (this.panel.locationData === "json endpoint") {
      if (!this.panel.jsonUrl) {
        return;
      }
        this.render();
    } else if (this.panel.locationData === "OpenHistorian") {
        // Added Open Historian Connection
        this.render();

    } 
  }

  reloadLocations(res) {
    this.locations = res;
    this.refresh();
  }
	
  onPanelTeardown() {
    if (this.map) {
      this.map.remove();
    }
  }

  onInitEditMode() {
    this.addEditorTab(
      "Phasormap",
      "public/plugins/grafana-pmumap-panel/partials/editor.html",
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

		if (this.panel.locationData === "json endpoint") {
            this.series = this.filterData(dataList);
			this.dataFormatter.setjsonendpoint(data);
      }  else if (this.panel.locationData === "OpenHistorian") {
            this.series = this.filterData(dataList);
          this.dataFormatter.setOpenHistorian(data);
        } 

    } catch (err) {
      appEvents.emit('alert-error', ['Data error', err.toString()])
	  console.log(err)
    }
  }

    filterData(data) {

        if (this.panel.filter == "") {
            return data;
        }

        
        let filter = this.panel.filter;
        try {
            filter = this.templateSrv.replace(this.panel.filter, this.panel.scopedVars, 'regex');
        } catch (e) {
            console.log('Map panel error: ', e);
        }

        let filtereddata: any[] = [];
        let re = new RegExp(filter);

        data.forEach(item => {
            if (re.test(item.target)) {
                filtereddata.push(item);
            }
        });
        console.log(filtereddata)
        return filtereddata
    }

  centerOnLastGeoHash() {
    const last: any = _.last(this.data);
    mapCenters[this.panel.mapCenter].mapCenterLatitude = last.locationLatitude;
    mapCenters[this.panel.mapCenter].mapCenterLongitude = last.locationLongitude;
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
		this.panel.customlayers.push({
			name: "Custom Layer " + this.panel.customlayers.length, link: "",
			dynamic: true,
			usercontrolled: false,
			type: "geojson",
			opacity: "1.0",
			forceReload: false,
			layer: "",
			zIndex: 0,
			minZoom: 0,
			maxZoom: 18
		});
        this.UpdateCustomLayer();
    }

    RemoveCustomLayer(id) {
        let name = this.panel.customlayers[id].name;
        this.panel.customlayers.splice(id, 1);
        delete this.customlayerData[name];
        this.UpdateCustomLayer();
       
    }

	ChangedlayerData(layer) {
		layer.forceReload = true;
		
		this.UpdateCustomLayer();

	}

	UpdateCustomLayer() {
        let promisedata: Promise<void>[] = [];

        this.customlayerData = {};

		var promiseCtrl = this;

		this.panel.customlayers.forEach(layer => {
			let layerlink = layer.link;
			if (this.data && this.data.newestTS) {
				layerlink = layerlink.replace(/{LatestTS}/gi, moment(this.data.newestTS).format("DD-MM-YYYYTHH-mm-ss"));
			}
			if (this.data && this.data.oldestTS) {
				layerlink = layerlink.replace(/{OldestTS}/gi, moment(this.data.oldestTS).format("DD-MM-YYYYTHH-mm-ss"));
			}

			if (layer.link && layer.type == "geojson") {
					promisedata.push(
						$.getJSON(layerlink).then(res => {
							if (promiseCtrl.customlayerData[layer.name]) {

								promiseCtrl.customlayerData[layer.name].data = res;
								promiseCtrl.customlayerData[layer.name].usercontrolled = layer.usercontrolled;
								promiseCtrl.customlayerData[layer.name].forceReload = true;
								layer.forceReload = false;
							}
							else {
								promiseCtrl.customlayerData[layer.name] = { data: res, usercontrolled: layer.usercontrolled, type: "geojson", forceReload: layer.forceReload };
								layer.forceReload = false;
							}
						}).catch(e => {
						})
					);
			}
			else if (layer.link && layer.type == "wms") {
				this.customlayerData[layer.name] = { usercontrolled: layer.usercontrolled, link: layerlink, type: "wms", forceReload: layer.forceReload, oppacity: parseFloat(layer.opacity), layer: layer.layer }
				layer.forceReload = false;
			}
			else if (layer.link && layer.type == "tile") {
				this.customlayerData[layer.name] = { usercontrolled: layer.usercontrolled, link: layerlink, type: "tile", forceReload: layer.forceReload, oppacity: parseFloat(layer.opacity) }
				layer.forceReload = false;
			}
			else if (layer.link && layer.type == "text") {
				promisedata.push(
					$.getJSON(layerlink).then(res => {
					if (promiseCtrl.customlayerData[layer.name]) {

						promiseCtrl.customlayerData[layer.name].data = res;
						promiseCtrl.customlayerData[layer.name].usercontrolled = layer.usercontrolled;
						promiseCtrl.customlayerData[layer.name].forceReload = true;
						layer.forceReload = false;
					}
					else {
						promiseCtrl.customlayerData[layer.name] = { data: res, usercontrolled: layer.usercontrolled, type: "text", forceReload: layer.forceReload };
						layer.forceReload = false;
					}
				}).catch(e => {
				})
					);
			}
			else { console.log(layer);}
        });

        

		Promise.all(promisedata).then(function () {
            promiseCtrl.render();	
			
			if (!promiseCtrl.map)
			{return;}
			
            promiseCtrl.map.updateStaticLayer();
        });
    }

	UpdateCustomDynamicLayer() {

        let promisedata: Promise<void>[] = [];
		

        var promiseCtrl = this;
		this.panel.customlayers.forEach(layer => {

			let layerlink = layer.link;

			if (this.data && this.data.newestTS) {
				layerlink = layerlink.replace(/{LatestTS}/gi, moment(this.data.newestTS).format("DD-MM-YYYYTHH-mm-ss"));
			}
			if (this.data && this.data.oldestTS) {
				layerlink = layerlink.replace(/{OldestTS}/gi, moment(this.data.oldestTS).format("DD-MM-YYYYTHH-mm-ss"));
			}

			if (layer.link && layer.dynamic && layer.type == "geojson") {            
					promisedata.push(
						$.getJSON(layerlink).then(res => {
							if (promiseCtrl.customlayerData[layer.name]) {

								promiseCtrl.customlayerData[layer.name].data = res;
								promiseCtrl.customlayerData[layer.name].usercontrolled = layer.usercontrolled;
								promiseCtrl.customlayerData[layer.name].forceReload = true;
								layer.forceReload = false;
							}
							else {
								promiseCtrl.customlayerData[layer.name] = { data: res, usercontrolled: layer.usercontrolled, type: "geojson", forceReload: layer.forceReload };
								layer.forceReload = false;
							}
						}).catch(e => {
						})
					);

			}
			else if (layer.link && layer.dynamic && layer.type == "wms") {
				this.customlayerData[layer.name] = { usercontrolled: layer.usercontrolled, link: layerlink, type: "wms", forceReload: layer.forceReload, layer: layer.layer}
			}
			else if (layer.link && layer.dynamic && layer.type == "text") {
				promisedata.push(
					$.getJSON(layerlink).then(res => {
						if (promiseCtrl.customlayerData[layer.name]) {

							promiseCtrl.customlayerData[layer.name].data = res;
							promiseCtrl.customlayerData[layer.name].usercontrolled = layer.usercontrolled;
							promiseCtrl.customlayerData[layer.name].forceReload = false;
							layer.forceReload = false;
						}
						else {
							promiseCtrl.customlayerData[layer.name] = { data: res, usercontrolled: layer.usercontrolled, type: "text", forceReload: layer.forceReload };
							layer.forceReload = false;
						}
					}).catch(e => {
					})
				);

			}
        });

        
		Promise.all(promisedata).then(function () {
            promiseCtrl.render();
			
			if (!promiseCtrl.map)
			{
				return;
			}
			
			promiseCtrl.map.updateStaticLayer();
			
        });

    }

	ChangedMapOptions(map) {
		// This is counterintuitive But Custom Layer will update the controll so this is important
		map.forceReload = true;
		map.updateStaticLayer();
	}

	RemovedMapOption(index) {
		this.panel.selectableMaps.splice(index, 1);
		this.map.updateStaticLayer();
	}

	AddedMapOption() {
		this.panel.selectableMaps.push({ name: "Map " + this.panel.selectableMaps.length, map: this.mapOptions[0], forceReload: false });
		this.map.updateStaticLayer();
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
		console.log("created map");
        const map = new PhasorMap(ctrl, mapContainer[0]);
        map.createMap();
        ctrl.map = map;
        ctrl.map.updateStaticLayer();
		ctrl.UpdateCustomLayer()    
        
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
