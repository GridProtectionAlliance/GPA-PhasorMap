import * as _ from 'lodash';
import * as L from './libs/leaflet';
import PhasorMapCtrl from './worldmap_ctrl';
//import Layer from "./Layer";
//import { Map } from "./Maps"
//import $ from "jquery";


export default class PhasorMap {
	ctrl: PhasorMapCtrl;
    mapContainer: any;
    circles: any[];
    arrows: any[];
    map: any;
	legend: any;

    
    Controlledlayer: any;
    switchableLayer: any;
	staticSeperateLayer: any;

	//### Layers ######
    mapLayer: any; // Map Background
    mapChanged: boolean;
    controllLayer: any;

    featureController: FeatureCtrl; // features

	//Layer references


	//backgroundlayer: any;

	previousZoom: number;
	ControlledMaps: any;



    constructor(ctrl, mapContainer) {
        this.ctrl = ctrl;
		this.mapContainer = mapContainer;

        this.circles = [];
        this.arrows = [];
		this.switchableLayer = {};
		this.staticSeperateLayer = {};
		this.previousZoom = 0;
		this.ControlledMaps = {};

    }

	createMap() {
        this.mapChanged = false;

        const mapCenter = (<any>window).L.latLng(
            parseFloat(this.ctrl.panel.mapCenterLatitude),
            parseFloat(this.ctrl.panel.mapCenterLongitude)
		);

        this.map = L.map(this.mapContainer, {
            worldCopyJump: true,
            preferCanvas: true,
            center: mapCenter,
			zoom: parseFloat(this.ctrl.panel.initialZoom) || 1,
			zoomSnap: parseFloat(this.ctrl.panel.zoomSteps) || 1,
			zoomDelta: parseFloat(this.ctrl.panel.zoomSteps) || 1
        });


        this.setMouseWheelZoom();

        this.mapLayer = this.ctrl.mapData[0].getLayer(parseFloat(this.ctrl.panel.initialZoom) || 1).addTo(this.map);
		

        //this.Controlledlayer = L.control.layers(null).addTo(this.map);
        this.controllLayer = L.control.layers(null).addTo(this.map);

        //create new pane for overlays
        this.map.createPane('overlays');
        this.map.getPane('overlays').style.zIndex = 350;
        this.map.getPane('overlays').style.pointerEvents = 'none';

        this.featureController = new FeatureCtrl(this);

        let ctrl = this;

        this.map.on("zoomend", () => {
            ctrl.ctrl.render();
		//this.previousZoom = this.map.getZoom();
			//this.drawFeatures();
			//console.log(this.previousZoom)

            //if (this.ctrl.panel.moveOverlap && this.ctrl.panel.locationData === "OpenHistorian") {
            //    this.ctrl.dataFormatter.setOpenHistorian([]);
            //}
		});

		this.map.on('baselayerchange', function (e) {
			//update this and set the corresponding Layer
            ctrl.mapLayer = e.layer;
			console.log(e);
			//Remove the new Layer and add the appropriate actual Layer
		});

        this.map.on('overlayadd', function (e) {
            let layer = ctrl.ctrl.layerData.find(item => item.name === e.name);
            if (layer) {
                layer.isactive = true;
            }

        });

        

    }


	// Deal with overlays....
	// 1) Load Data
	// 2) Display them as neccesarry
	RedrawOverlays() {

		if (this.ctrl.panel.customlayers.length == 0)
			return;

		let promise: any[] = []
        this.ctrl.layerData.forEach(layer => {
			promise.push(layer.getData())
		});

		let ctrl = this;

        console.log(promise)
       
        Promise.all(promise).then(function () {
            ctrl.map.off('overlayremove');

            ctrl.ctrl.layerData.forEach(layer => {
				// Remove all updatedLayer
				let addLayer: boolean = false;
                

                if (layer.layer != null) {
                    if (layer.dynamic || layer.changed) {
                        
                        ctrl.map.removeLayer(layer.layer);
                        layer.updateLayer();
                        //check zoomLevel
                        addLayer = true;
                        if (layer.parameters.minZoom && layer.parameters.minZoom > ctrl.map.getZoom()) {
                            addLayer = false;
                        }
                        if (layer.parameters.maxZoom && layer.parameters.maxZoom < ctrl.map.getZoom()) {
                            addLayer = false;
                        }
                    }
                }

                if (layer.layer == null) {
                    layer.updateLayer();

                    //check zoomLevel
                    addLayer = true;
                    if (layer.parameters.minZoom && layer.parameters.minZoom > ctrl.map.getZoom()) {
                        addLayer = false;
                    }
                    if (layer.parameters.maxZoom && layer.parameters.maxZoom < ctrl.map.getZoom()) {
                        addLayer = false;
                    }
                }

                if (addLayer && layer.isactive) {

                    layer.layer.addTo(ctrl.map)
                }
               
			})

            ctrl.SortOverlays()
            ctrl.PopulateControl()
            
        
        })

	}

    PopulateControl() {

        let ctrl = this;
        this.controllLayer.remove();

        this.map.on('overlayremove', function (e) {
            let layer = ctrl.ctrl.layerData.find(item => item.name === e.name);

            if (layer) {
                layer.isactive = false;
            }
        });
        


        let userLayers = {};
        let nLayers = 0;

        this.ctrl.layerData.forEach(layer => {

            let addlayer = false;
            if (layer.user) {
                addlayer = true;
                if (layer.parameters.minZoom && layer.parameters.minZoom > this.map.getZoom()) {
                    addlayer = false;
                }
                if (layer.parameters.maxZoom && layer.parameters.maxZoom < this.map.getZoom()) {
                    addlayer = false;
                }
            }
            if (addlayer) {
                nLayers = nLayers + 1;
                userLayers[layer.name] = layer.layer;
            }

        })

        if (nLayers > 0) {
            this.controllLayer = L.control.layers(null, userLayers, { collapsed: false, hideSingleBase: true }).addTo(this.map);
        }
    }


    SortOverlays() {
		//Sort all the layers by z-index (lower = lower on the map....)

		let keysToSort: any[] = [];
		

        this.ctrl.layerData.forEach(layer => {
			
			if (layer.type === 'text') { }
			else {
                keysToSort.push({ layer: layer.layer, zIndex: parseInt(layer.parameters.zIndex) });
			}
		})
		
		
        keysToSort.sort(function (a, b) { return a.zIndex - b.zIndex; });

	

		//Map Layers accoring to zIndex
        keysToSort.forEach(layer => {
            layer.layer.bringToFront();
        });

	}

	
    createLegend() {
        this.legend = (<any>window).L.control({ position: 'bottomleft' });
        this.legend.onAdd = () => {
            this.legend._div = (<any>window).L.DomUtil.create('div', 'info legend');
            this.legend.update();
            return this.legend._div;
        };

        this.legend.update = () => {
            const thresholds = this.ctrl.data.thresholds;
            let legendHtml = '';
            legendHtml +=
                '<div class="legend-item"><i style="background:' +
                this.ctrl.panel.colors[0] +
                '"></i> ' +
                '&lt; ' +
                thresholds[0] +
                '</div>';
            for (let index = 0; index < thresholds.length; index += 1) {
                legendHtml +=
                    '<div class="legend-item"><i style="background:' +
                    this.ctrl.panel.colors[index + 1] +
                    '"></i> ' +
                    thresholds[index] +
                    (thresholds[index + 1] ? '&ndash;' + thresholds[index + 1] + '</div>' : '+');
            }
            this.legend._div.innerHTML = legendHtml;
        };
        this.legend.addTo(this.map);
    }

    RedrawBaseLayer() {
        if (!this.mapChanged)
            return;

        this.mapLayer.remove()

        this.mapLayer = this.ctrl.mapData[0].getLayer(this.map.getZoom()).addTo(this.map);
        this.mapChanged = false;

        if (this.ctrl.mapData[0].maps[this.ctrl.mapData[0].getMap(this.map.getZoom())] === "CartoDB Dark") {
            this.ctrl.saturationClass = "map-darken";
        } else {
            this.ctrl.saturationClass = "";
        }

    }


    drawFeatures() {

        //Remove data layer
        if (this.featureController.layer != null) {
            this.featureController.layer.clearLayers()
            this.map.removeLayer(this.featureController.layer);
        }
        
        if (this.ctrl.data.length == 0)
            return;

        //Add new data layer
        this.featureController.getLayer(this.ctrl.data);
        this.featureController.layer.addTo(this.map);
    }


    /*updateFeatures(data) {
        if (this.ctrl.panel.featureType === "circles") {
            this.updateCircles(data);
        }
        else if (this.ctrl.panel.featureType === "phasor-clock") {
            this.updateClocks(data);
        }
    }

    // Section to update and create Circles
    updateCircles(data) {
        data.forEach(dataPoint => {
            if (!dataPoint.locationName) {
                return;
            }

            const circle = _.find(this.circles, cir => {
                return cir.options.location === dataPoint.key;
            });


            if (circle) {
                circle.setRadius(this.calcCircleSize(dataPoint.value || 0));
                circle.setStyle({
                    color: this.getColor(dataPoint.value),
                    fillColor: this.getColor(dataPoint.value),
                    fillOpacity: 0.5,
                    location: dataPoint.key,
                });
                circle.closePopup();
                circle.unbindPopup();
                this.createPopup(circle, dataPoint.locationName, dataPoint.valueRounded, dataPoint);
            }
        });
    }

    

    

    //End Circle Section

    // Section to update and Create PhasorClocks
    updateClocks(data) {

        this.updateCircles(data)

        data.forEach(dataPoint => {
            if (!dataPoint.locationName) {
                return;
            }

           
            const arrow = _.find(this.arrows, arr => {
                return arr.options.location === dataPoint.key;
            });

            if (arrow) {
                let points = [
                    [dataPoint.locationLatitude, dataPoint.locationLongitude],
                    this.CalculateEndPoint(dataPoint)];
                arrow.setLatLngs(points);
                arrow.setStyle({
                    color: this.getSecondaryColor(dataPoint.value),
                    fillColor: this.getSecondaryColor(dataPoint.value),
                    fillOpacity: 1.0,
                    location: dataPoint.key,
                });
            }
        });
    }

    createClocks(data) {
        const circles: any[] = [];
        const arrows: any[] = [];

        data.forEach(dataPoint => {
            if (!dataPoint.locationName) {
                return;
            }
            if ((!dataPoint.locationLatitude) || (!dataPoint.locationLongitude)) {
            }
            else {
                circles.push(this.createCircle(dataPoint));
                arrows.push(this.createArrow(dataPoint));
            }

        });
        this.featuresLayer = this.addFeatures(circles.concat(arrows));
        this.circles = circles;
        this.arrows = arrows;
    }

    createArrow(dataPoint) {
        const arrow = (<any>window).L.polyline([[dataPoint.locationLatitude, dataPoint.locationLongitude], this.CalculateEndPoint(dataPoint)], {
            color: this.getSecondaryColor(dataPoint.value),
            fillColor: this.getSecondaryColor(dataPoint.value),
            fillOpacity: 1.0,
            location: dataPoint.key,
        });

       
        return arrow;
    }

    CalculateEndPoint(datapoint) {

        var latlng = (<any>window).L.latLng(datapoint.locationLatitude, datapoint.locationLongitude);
        let point1 = this.map.project(latlng, this.map.getZoom())
        let point2 = point1;
        

        let angle = (datapoint.value || 0);
        let length = this.calcCircleSize(datapoint.value);
        point2.x = point1.x + length * Math.cos(angle * Math.PI / 180)
        point2.y = point1.y - length * Math.sin(angle * Math.PI / 180)

        latlng = this.map.unproject(point2, this.map.getZoom());
        return [latlng.lat, latlng.lng];
    }
    //End PhasporClock Section

    createPopup(circle, locationName, value, point) {
        let label;

       
            label = this.ctrl.panel.popupstring;
            label = label.replace(/{value}/gi, value);
            label = label.replace(/{deviceID}/gi, point.deviceId);
            label = label.replace(/{PointTag}/gi, point.PointTag);
            label = label.replace(/{deviceName}/gi, point.deviceName);


        if (this.ctrl.panel.stickyLabels && this.ctrl.panel.constantLabels) {
            circle.bindPopup(label, {
                offset: (<any>window).L.point(0, -2),
                className: 'worldmap-popup',
                closeButton: false,
                autoClose: false,
                closeOnClick: false,
                closeOnEscapeKey: false,
            }).openPopup();
        }
        else {
            circle.bindPopup(label, {
                offset: (<any>window).L.point(0, -2),
                className: 'worldmap-popup',
                closeButton: this.ctrl.panel.stickyLabels,
            });
        }


        circle.on('mouseover', function onMouseOver(evt) {
            const layer = evt.target;
            layer.bringToFront();
            this.openPopup();
        });

        if (!this.ctrl.panel.stickyLabels) {
            circle.on('mouseout', function onMouseOut() {
                circle.closePopup();
            });
        }
    }


    getSecondaryColor(value) {
        for (let index = this.ctrl.data.secondarythresholds.length; index > 0; index -= 1) {
            if (value >= this.ctrl.data.secondarythresholds[index - 1]) {
                return this.ctrl.panel.secondarycolors[index];
            }
        }
        return _.first(this.ctrl.panel.secondarycolors);
    } */

    resize() {
        this.map.invalidateSize();
    }

    panToMapCenter() {
        this.map.panTo([parseFloat(this.ctrl.panel.mapCenterLatitude), parseFloat(this.ctrl.panel.mapCenterLongitude)]);
        this.ctrl.mapCenterMoved = false;
    }

    removeLegend() {
        this.legend.remove(this.map);
        this.legend = null;
    }

    setMouseWheelZoom() {
        if (!this.ctrl.panel.mouseWheelZoom) {
            this.map.scrollWheelZoom.disable();
        } else {
            this.map.scrollWheelZoom.enable();
        }
    }


    setZoom(zoomFactor) {
		this.map.setZoom(parseFloat(zoomFactor));
    }

    remove() {
        if (this.featureController.layer != null) {
            this.featureController.layer.clearLayers()
            this.map.removeLayer(this.featureController.layer);
        }

        if (this.legend) {
            this.removeLegend();
        }
            
        this.map.remove();
         
    }
}

class FeatureCtrl {
    ctrl: PhasorMap;
    layer: any;
    data: any;

    constructor(src: PhasorMap) {
        this.ctrl = src;
        this.layer = null;
        this.data = null;
    }

    getLayer(data) {

        let filtData = this.filterData(data);
        let layers: any[] = [];

        if (this.ctrl.ctrl.panel.featureType === "circles") {
            layers = this.createCircles(filtData);
        }

        else if (this.ctrl.ctrl.panel.featureType === "phasor-clock") {
            console.log("not implemented yet")
        }

        else if (this.ctrl.ctrl.panel.featureType === "4-bit bar") {
            layers = this.createRecatangle(filtData)
        }


        this.layer = (<any>window).L.layerGroup(layers);
    }

    filterData(data) {
        let result = this.filterEmptyAndZeroValues(data);
        result = this.ctrl.ctrl.filterData(result);
        return result;
    }

    filterEmptyAndZeroValues(data) {
        return _.filter(data, o => {
            return !(this.ctrl.ctrl.panel.hideEmpty && _.isNil(o.value)) &&
                !(this.ctrl.ctrl.panel.hideZero && o.value === 0) &&
                !(this.ctrl.ctrl.panel.hideEmpty && Number.isNaN(o.value));
        });
    }

   
    // ##### Feature Functions #####

    // #### Circles ####
    createCircles(data) {
        let results: any[] = [];

        data.forEach(dataPoint => {
            
            if ((!dataPoint.locationLatitude) || (!dataPoint.locationLongitude)) {
                // Can not do this without Location name
            }
            else {
                let circle = (<any>window).L.circleMarker([dataPoint.locationLatitude, dataPoint.locationLongitude], {
                    radius: this.calcCircleSize(dataPoint.value || 0),
                    color: this.getColor(dataPoint.value, 0),
                    fillColor: this.getColor(dataPoint.value, 0),
                    fillOpacity: 0.5,
                });
                results.push(circle);

                circle.closePopup();
                circle.unbindPopup();

                if (this.ctrl.ctrl.panel.dataLabels) {
                    this.createPopup(circle, dataPoint);
                }
            }

        });

       


        //this.createPopup(circle, dataPoint.locationName, dataPoint.valueRounded, dataPoint);
        return results;        
    }

    calcCircleSize(dataPointValue) {
        const circleMinSize = parseInt(this.ctrl.ctrl.panel.feature.circleMinSize, 10) || 2;
        const circleMaxSize = parseInt(this.ctrl.ctrl.panel.feature.circleMaxSize, 10) || 30;

        if (this.ctrl.ctrl.data.valueRange === 0) {
            return circleMaxSize;
        }

        const dataFactor = (dataPointValue - this.ctrl.ctrl.data.lowestValue) / this.ctrl.ctrl.data.valueRange;
        const circleSizeRange = circleMaxSize - circleMinSize;

        return circleSizeRange * dataFactor + circleMinSize;
    }

    getColor(value, colorindex) {
        let threshholds = this.ctrl.ctrl.panel.feature.thresholds[colorindex].split(",").map(item => parseInt(item, 10))

        for (let index = threshholds.length; index > 0; index -= 1) {
            if (value >= threshholds[index - 1]) {
                return this.ctrl.ctrl.panel.feature.colors[colorindex][index];
            }
        }
        return _.first(this.ctrl.ctrl.panel.feature.colors[colorindex]);
    }

    

    // #### Clocks ####

    // #### Bars ####
    createRecatangle(data) {
        let results: any[] = [];

        data.forEach(dataPoint => {

            if ((!dataPoint.locationLatitude) || (!dataPoint.locationLongitude)) {
                // Can not do this without Location name
            }
            else {

                var latlng = (<any>window).L.latLng(dataPoint.locationLatitude, dataPoint.locationLongitude);
                let point1 = this.ctrl.map.project(latlng, this.ctrl.map.getZoom())
                let point2 = this.ctrl.map.project(latlng, this.ctrl.map.getZoom())

                point2.x = point1.x + 0.5 * this.ctrl.ctrl.panel.feature.width;
                point2.y = point1.y - 0.5 * this.ctrl.ctrl.panel.feature.height;

                point1.x = point1.x - 0.5 * this.ctrl.ctrl.panel.feature.width;
                point1.y = point1.y + 0.5 * this.ctrl.ctrl.panel.feature.height;

                
                let pt1 = this.ctrl.map.unproject(point1, this.ctrl.map.getZoom());
                let pt2 = this.ctrl.map.unproject(point2, this.ctrl.map.getZoom());

                let rect = (<any>window).L.rectangle([[pt1.lat, pt1.lng], [pt2.lat, pt2.lng]], {
                    color: this.ctrl.ctrl.panel.feature.colors[0][0],
                    fillColor: this.ctrl.ctrl.panel.feature.colors[0][0],
                    fillOpacity: 0.8,

                });

                let invrect = (<any>window).L.rectangle([[pt1.lat, pt1.lng], [pt2.lat, pt2.lng]], {
                    fillOpacity: 0.0,
                    stroke: false,
                });

                //create all four bars (active for now)
                let hbar = this.ctrl.ctrl.panel.feature.height - 8;
                let wbar = Math.floor((this.ctrl.ctrl.panel.feature.width - 8 - 6) / 4.0);

                let point3 = this.ctrl.map.project(latlng, this.ctrl.map.getZoom());
                point1.x = point1.x + 4;
                point1.y = point1.y - 4;

                point3.y = point1.y - hbar;
                point3.x = point1.x + wbar;
                pt1 = this.ctrl.map.unproject(point1, this.ctrl.map.getZoom());
                pt2 = this.ctrl.map.unproject(point3, this.ctrl.map.getZoom());

                let cindex = ((dataPoint.value & 1)) == 1 ? 1 : 2

                let bit1 = (<any>window).L.rectangle([[pt1.lat, pt1.lng], [pt2.lat, pt2.lng]], {
                    color: this.ctrl.ctrl.panel.feature.colors[0][0],
                    fillColor: this.ctrl.ctrl.panel.feature.colors[0][cindex],
                    fillOpacity: 1.0,
                    weight: 2.0
                });

                point1.x = point3.x + 2;
                point3.x = point1.x + wbar;

                pt1 = this.ctrl.map.unproject(point1, this.ctrl.map.getZoom());
                pt2 = this.ctrl.map.unproject(point3, this.ctrl.map.getZoom());

                cindex = ((dataPoint.value & 2)) == 1 ? 1 : 2

                let bit2 = (<any>window).L.rectangle([[pt1.lat, pt1.lng], [pt2.lat, pt2.lng]], {
                    color: this.ctrl.ctrl.panel.feature.colors[0][0],
                    fillColor: this.ctrl.ctrl.panel.feature.colors[0][cindex],
                    fillOpacity: 1.0,
                    weight: 2.0
                });

                point1.x = point3.x + 2;
                point3.x = point3.x + 2 + wbar;

                pt1 = this.ctrl.map.unproject(point1, this.ctrl.map.getZoom());
                pt2 = this.ctrl.map.unproject(point3, this.ctrl.map.getZoom());

                cindex = ((dataPoint.value & 4)) == 1 ? 1 : 2

                let bit3 = (<any>window).L.rectangle([[pt1.lat, pt1.lng], [pt2.lat, pt2.lng]], {
                    color: this.ctrl.ctrl.panel.feature.colors[0][0],
                    fillColor: this.ctrl.ctrl.panel.feature.colors[0][cindex],
                    fillOpacity: 1.0,
                    weight: 2.0
                });

                point1.x = point3.x + 2;
                point3.x = point1.x + 2 + wbar;

                pt1 = this.ctrl.map.unproject(point1, this.ctrl.map.getZoom());
                pt2 = this.ctrl.map.unproject(point3, this.ctrl.map.getZoom());

                cindex = ((dataPoint.value & 8)) == 1 ? 1 : 2

                let bit4 = (<any>window).L.rectangle([[pt1.lat, pt1.lng], [pt2.lat, pt2.lng]], {
                    color: this.ctrl.ctrl.panel.feature.colors[0][0],
                    fillColor: this.ctrl.ctrl.panel.feature.colors[0][cindex],
                    fillOpacity: 1.0,
                    weight: 2.0
                });

                results.push(rect);
                results.push(bit1);
                results.push(bit2);
                results.push(bit3);
                results.push(bit4);
                results.push(invrect)

                
                invrect.closePopup();
                invrect.unbindPopup();

                if (this.ctrl.ctrl.panel.dataLabels) {
                    this.createPopup(invrect, dataPoint);
                }
            }

        });




        //this.createPopup(circle, dataPoint.locationName, dataPoint.valueRounded, dataPoint);
        return results;
    }


    // #### Popups ####

    createPopup(circle, point) {
        let label;

        label = this.ctrl.ctrl.panel.popupstring;
        label = label.replace(/{value}/gi, point.value);
        label = label.replace(/{deviceID}/gi, point.deviceId);
        label = label.replace(/{PointTag}/gi, point.PointTag);
        label = label.replace(/{deviceName}/gi, point.deviceName);

        console.log()
        if (this.ctrl.ctrl.panel.stickyLabels && this.ctrl.ctrl.panel.constantLabels) {
            circle.bindPopup(label, {
                offset: (<any>window).L.point(0, -2),
                className: 'worldmap-popup',
                closeButton: false,
                autoClose: false,
                closeOnClick: false,
                closeOnEscapeKey: false,
            }).openPopup();
        }
        else {
            circle.bindPopup(label, {
                offset: (<any>window).L.point(0, -2),
                className: 'worldmap-popup',
                closeButton: this.ctrl.ctrl.panel.stickyLabels,
            });
        }


        circle.on('mouseover', function onMouseOver(evt) {
            const layer = evt.target;
            layer.bringToFront();
            this.openPopup();
        });

        if (!this.ctrl.ctrl.panel.stickyLabels) {
            circle.on('mouseout', function onMouseOut() {
                circle.closePopup();
            });
        }
    }
}
