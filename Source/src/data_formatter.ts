import * as _ from 'lodash';
import kbn from 'grafana/app/core/utils/kbn';
import $ from "jquery";

export default class DataFormatter {
  constructor(private ctrl) {}

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

        if (this.ctrl.series && this.ctrl.series.length > 0) {
            let highestValue = 0;
            let lowestValue = Number.MAX_VALUE;
            let newestTS = 0;
            let oldestTS = Number.MAX_SAFE_INTEGER;


            let locationrequest = new Array();
            this.ctrl.series.forEach(point => {
                const datarequest = {
                    refId: point.refId,
                    target: point.target
                };
                locationrequest.push(datarequest);
            });

            let requestURL = "../api/grafana/GetLocationData"

            if (this.ctrl.panel.moveOverlap) {				
				if (this.ctrl.map)
				{
					requestURL = requestURL + "?radius=" + this.ctrl.panel.radiusOverlap + "&zoom=" + this.ctrl.map.map.getZoom()
				}
            }

            $.ajax({
                type: "POST",
                url: requestURL,
                data: JSON.stringify(locationrequest),
                contentType: "application/json",
                dataType: "json",
                success: res => {
                    this.ctrl.locations = JSON.parse(res);
                }
            });

            this.ctrl.series.forEach(point => {
                let location;
				
				
                if (this.ctrl.locations) {
					
                    location = _.find(this.ctrl.locations,loc => {
                        return ((loc.PointTag != null) && (loc.PointTag.toUpperCase() === point.target.toUpperCase()));
                    }); 

                
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
					TSmax = point.datapoints[point.datapoints.length -1][1];
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

            this.ctrl.updateThresholdData();
            this.ctrl.updateSecondaryThresholdData();

            this.ctrl.render();

        }
    }

setjsonendpoint(data) {

	if (this.ctrl.series && this.ctrl.series.length > 0) {
		let highestValue = 0;
		let lowestValue = Number.MAX_VALUE;
		let newestTS = 0;
		let oldestTS = Number.MAX_SAFE_INTEGER;
		
		
		if (!this.ctrl.panel.jsonUrl) {
			return;
		}
		var promisectr = this;

		$.getJSON(this.ctrl.panel.jsonUrl).then(res => {
			promisectr.ctrl.locations = res;
		}).fail(function (d, textStatus, error) {
			console.error("getJSON failed, status: " + textStatus + ", error: " + error)
		});

		


		this.ctrl.series.forEach(point => {
			let location;
			if (this.ctrl.locations) {
				location = _.find(this.ctrl.locations, loc => {
					return loc.PointTag.toUpperCase() === point.target.toUpperCase();
				});


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

        this.ctrl.updateThresholdData();
        this.ctrl.updateSecondaryThresholdData();

        this.ctrl.render();

	}
}
}

