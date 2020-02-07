import * as _ from 'lodash';
import kbn from 'grafana/app/core/utils/kbn';
import $ from "jquery";
import PhasorMapCtrl from './worldmap_ctrl';

export default class DataFormatter {
    ctrl: PhasorMapCtrl;

    constructor(ctrl) {
        this.ctrl = ctrl;
    }

  setValues(data) {
    if (this.ctrl.series && this.ctrl.series.length > 0) {
      let highestValue = 0;
        let lowestValue = Number.MAX_VALUE;
        

      this.ctrl.series.forEach(serie => {
        const lastPoint = _.last(serie.datapoints);
        const lastValue = _.isArray(lastPoint) ? lastPoint[0] : null;
        const location = _.find(this.ctrl.locations, loc => {
          return loc.key.toUpperCase() === serie.alias.toUpperCase();
        });

        if (!location) {
          return;
        }

        if (_.isString(lastValue)) {
          data.push({ key: serie.alias, value: 0, valueFormatted: lastValue, valueRounded: 0 });
        } else {
          const dataValue = {
            key: serie.alias,
            locationName: location.name,
            locationLatitude: location.latitude,
            locationLongitude: location.longitude,
            value: serie.stats[this.ctrl.panel.valueName],
            valueFormatted: lastValue,
            valueRounded: 0,
          };

          if (dataValue.value > highestValue) {
            highestValue = dataValue.value;
          }

          if (dataValue.value < lowestValue) {
            lowestValue = dataValue.value;
          }

          dataValue.valueRounded = kbn.roundValue(dataValue.value, parseInt(this.ctrl.panel.decimals, 10) || 0);
          data.push(dataValue);
        }
      });

      data.highestValue = highestValue;
      data.lowestValue = lowestValue;
        data.valueRange = highestValue - lowestValue;
        
    }
  }



    setOpenHistorian(data) {

        if (data && data.length > 0) {
            
            let locationrequest = new Array();
            data.forEach(point => {
                const datarequest = {
                    refId: point.refId,
                    target: point.target
                };
                locationrequest.push(datarequest);
            });

            let query = { target: locationrequest, radius: null, zoom: null }

            if (this.ctrl.panel.moveOverlap && this.ctrl.map) {				
                    query.radius = this.ctrl.panel.radiusOverlap
                    query.zoom = this.ctrl.map.map.getZoom()
            }

            let ctrl = this;

            return this.ctrl.datasource.queryLocation(query).then(function (data) {
                ctrl.ctrl.locations = JSON.parse(data.data);
            })
           
        }

        return Promise.resolve(true);
    }

    setjsonendpoint(data) {

        if (data && data.length > 0) {

		    if (!this.ctrl.panel.jsonUrl) {
			    return;
            }

		    var ctrl = this;

		    return Promise.resolve($.getJSON(this.ctrl.panel.jsonUrl)).then(res => {
                ctrl.ctrl.locations = res;
		    }).catch(function (d) {
                console.error("getJSON failed, status: " + d)
                return (d)
		    });

        }

        return Promise.resolve(true);
    }






    ProcessData(data) {

        let highestValue = Number.MIN_VALUE;
        let lowestValue = Number.MAX_VALUE;

        let newestTS = Number.MIN_SAFE_INTEGER;
        let oldestTS = Number.MAX_SAFE_INTEGER;

        data.forEach(point => {

            let location;
            if (this.ctrl.locations) {
                try {

                    location = _.find(this.ctrl.locations, loc => {
                        return loc.PointTag.toUpperCase() === point.target.toUpperCase();
                    });

                }
                catch (ex) {
                    console.log(location)
                    console.log(point);
                    console.log(ex)
                }
            }
            
            else {
                location = { longitude: null, latitude: null, DeviceID: null, Device: null, PointTag: null };
            }

            if (!location) {
                location = { longitude: null, latitude: null, DeviceID: null, Device: null, PointTag: null };
            }

            let val = Number.NaN;
            let TSmin = Number.MAX_VALUE;
            let TSmax = 0;

            if (point.datapoints[0]) {
                TSmin = point.datapoints[0][1];
                TSmax = point.datapoints[point.datapoints.length - 1][1];
            }

            if (!point.datapoints[0]) {
                val = Number.NaN;
            }
            else {
                if (this.ctrl.panel.valueName === 'min') {
                    val = Number.MAX_VALUE;
                    point.datapoints.forEach(pt => {
                        if (pt[0] < val)
                            val = pt[0];
                    });
                }
                else if (this.ctrl.panel.valueName === 'max') {
                    val = -Number.MAX_VALUE;
                    point.datapoints.forEach(pt => {
                        if (pt[0] > val)
                            val = pt[0];
                    });
                }
                else if (this.ctrl.panel.valueName === 'current') {
                    val = point.datapoints.pop()[0];
                }
                else if (this.ctrl.panel.valueName === 'total') {
                    val = 0;
                    point.datapoints.forEach(pt => {
                        val = val + pt[0];
                    });
                }
                else if (this.ctrl.panel.valueName === 'avg') {
                    val = 0;
                    let np = 0;
                    point.datapoints.forEach(pt => {
                        val = val + pt[0];
                        np = np + 1;
                    });
                    val = val / np;
                }
            }
            if (val == Number.MAX_VALUE || val == Number.MIN_VALUE) {
                val = Number.NaN;
            }
            const dataValue = {
                key: point.target,
                locationName: point.target,
                locationLatitude: location.Latitude,
                locationLongitude: location.Longitude,
                value: val !== undefined ? val : Number.NaN,
                valueRounded: 0,
                deviceId: location.DeviceID,
                PointTag: location.PointTag,
                deviceName: location.Device,
                minTS: TSmin,
                maxTS: TSmax,
            };

            if (dataValue.value > highestValue) {
                highestValue = dataValue.value;
            }
            if (dataValue.value < lowestValue) {
                lowestValue = dataValue.value;
            }
            if (dataValue.minTS < oldestTS) {
                oldestTS = dataValue.minTS;
            }
            if (dataValue.maxTS > newestTS) {
                newestTS = dataValue.maxTS;
            }
            dataValue.valueRounded = Math.round(dataValue.value);
            data.push(dataValue);
        });

        data.highestValue = highestValue;
        data.lowestValue = lowestValue;
        data.valueRange = highestValue - lowestValue;

        data.newestTS = newestTS;
        data.oldestTS = oldestTS;

        this.ctrl.data = data;

    }



}

