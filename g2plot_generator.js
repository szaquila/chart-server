const puppeteer = require('puppeteer');

const render = async function (options, width, height) {
	const browser = await puppeteer.launch({
    defaultViewport: { width: 1280, height: 800 },
  });
	const page = await browser.newPage();
	await page.setDefaultNavigationTimeout(0);
	// await page.goto('https://www.baidu.com');
	// await page.screenshot({path:'example.png'});

	page.on('console', (msg) => {
		console.log(msg);
		// for (let i = 0; i < msg.args().length; ++i)
		//   console.log(`${i}: ${msg.args()[i]}`); // 译者注：这句话的效果是打印到你的代码的控制台
	});

	const containerElement = `<div id="container" style="width:${width}px;height:${height}px" ></div>`;
	const content = `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <title>chart</title>
  </head>
  <body>
      ${containerElement}
  </body>
  </html>`;
	await page.setContent(content);

	//传递options对象到evaluate函数中，挂载到window对象的全局属性中
	await page.evaluate((options) => {
		// 日期格式化
		const parseTime = (time, pattern) => {
			// if (arguments.length === 0 || !time) {
			// 	return null;
			// }
			// if (time.indexOf('01-01-01') > -1) {
			// 	return '-';
			// }
  		const format = pattern || '{y}-{m}-{d} {h}:{i}:{s}';
			let date;
			if (typeof time === 'object') {
				date = time;
			} else {
				if (typeof time === 'string' && /^[0-9]+$/.test(time)) {
					time = parseInt(time);
				}
				if (typeof time === 'number' && time.toString().length === 10) {
					time = time * 1000;
				}
				date = new Date(time);
			}
  		const formatObj = {
				y: date.getFullYear(),
				m: date.getMonth() + 1,
				d: date.getDate(),
				h: date.getHours(),
				i: date.getMinutes(),
				s: date.getSeconds(),
				a: date.getDay(),
			};
			const time_str = format.replace(/{(y|m|d|h|i|s|a)+}/g, (result, key) => {
				let value = formatObj[key];
				// Note: getDay() returns 0 on Sunday
				if (key === 'a') {
					return ['日', '一', '二', '三', '四', '五', '六'][value];
				}
				if (result.length > 0 && value < 10) {
					value = '0' + value;
				}
				return value || 0;
			});
			return time_str;
		};
		// 格式化显示字节
		const bpsFormat = (bytes, kmg, fixed) => {
			if (typeof bytes === 'undefined' || bytes <= 0) return '0 B';
			let k = kmg || 1000;
			k = Number(k);
			if (k === 0) k = 1024;
			if (k === 1) k = 1000;
			let dec = fixed || 0;
			dec = Number(dec);
			const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
			const i = Math.floor(Math.log(bytes) / Math.log(k));
			const val = bytes / Math.pow(k, i);
			if (dec > 0) {
				return val.toFixed(dec) + ' ' + sizes[i];
			}
			return val.toFixed(3) + ' ' + sizes[i];
		};
		const data = options.data;
		const s95 = options.th95;
		let content = '流入95%';
		let position = s95.in95;
		let start = s95.in95;
		let end = s95.in95;
		if (options.direct === true || options.direct === '0') {
			content = '流出95%';
			position = s95.out95;
			start = s95.out95;
			end = s95.out95;
		}
		window.chart = {
			options: {
				data: data,
				autoFit: true,
				height: 360,
				xField: '_time',
				yField: '_value',
				seriesField: '_field',
        appendPadding: [20, 20, 0, 20],
				color: ['#7AE17A', '#7A8FC5', '#FF0000', '#FF0000'],
				// smooth: true,
				annotations: [
					{
						type: 'text',
						position: ['min', position],
						content: content,
						offsetY: -4,
						style: {
							textBaseline: 'bottom',
						},
					},
					{
						type: 'line',
						start: ['min', start],
						end: ['max', end],
						style: {
							stroke: 'red',
							// lineDash: [2, 2],
						},
					},
				],
				meta: {
					_field: {
						formatter: (v) => {
							if (v == 'in') {
								return '流入';
							}
							return '流出';
						},
					},
					_value: {
						formatter: (v) => {
							return bpsFormat(v);
						},
					},
					_time: {
						formatter: (v) => {
							return parseTime(v);
						},
					},
				},
				legend: {
					layout: 'horizontal',
					position: 'bottom',
					offsetX: 13,
					offsetY: 13,
					items: [
						{
							name: '\n\n流入  95%: ' + bpsFormat(s95.in95) + '\n\n', //  + '最小: ' + bpsFormat(s95.in95Min) + ' 最大: ' + bpsFormat(s95.in95Max)
							value: 'in',
							marker: {
								symbol: 'square',
								style: {
									fill: '#7AE17A',
									radius: 5,
									lineWidth: 5,
								},
							},
						},
						{
							name: '\n\n流出  95%: ' + bpsFormat(s95.out95) + '\n\n', //  + '最小: ' + bpsFormat(s95.out95Min) + ' 最大: ' + bpsFormat(s95.out95Max)
							value: 'out',
							marker: {
								symbol: 'square',
								style: {
									fill: '#7A8FC5',
									radius: 5,
									lineWidth: 5,
								},
							},
						},
					],
				},
				xAxis: {
					range: [0, 1],
					type: 'timeCat',
					title: {
						text: s95._start + ' 至 ' + s95._stop,
            style: {
              fontWeight: 700,
            },
					},
					grid: {
						line: {
							style: {
								stroke: '#ddd',
								lineDash: [4, 2],
							},
						},
						// alternateColor: 'rgba(0,0,0,0.05)',
					},
					label: {
						formatter: (v) => {
							return v.substr(5, 11).replace(' ', '\n');
						},
            style: {
              fontSize: 9,
            },
					},
          tickInterval: 288,
				},
				yAxis: {
					title: {
						text: 'bits per second',
            style: {
              fontWeight: 700,
            },
					},
					label: {
						formatter: (v) => {
							return v.replace('.000', '');
						},
					},
          tickCount: 10,
				},
        animate: false,
        theme: {
          styleSheet: {
            backgroundColor: 'white',
          },
        },
			},
		};
	}, options);

	await page.addScriptTag({ url: 'https://unpkg.com/@antv/g2plot@latest/dist/g2plot.min.js' });
	await page.addScriptTag({ url: 'https://cdn.bootcss.com/jquery/3.4.1/jquery.min.js' });

	const scriptToInject = `
        const { Line } = G2Plot;
        (function (window) {
            let option = window.chart.options; //浏览器环境下获取window对象中chart的配置项进行初始化
            // console.log('option');
            const line = new Line('container', option);
            line.on('afterrender', () => {
              const renderer = line.chart.renderer;
              const canvas = line.chart.getCanvas();
              const canvasDom = canvas.get('el');
              canvas.get('timeline').stopAllAnimations();

              setTimeout(() => {
                let dataURL = '';
                if (renderer === 'svg') {
                  const clone = canvasDom.cloneNode(true);
                  const svgDocType = document.implementation.createDocumentType(
                    'svg',
                    '-//W3C//DTD SVG 1.1//EN',
                    'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'
                  );
                  const svgDoc = document.implementation.createDocument('http://www.w3.org/2000/svg', 'svg', svgDocType);
                  svgDoc.replaceChild(clone, svgDoc.documentElement);
                  const svgData = new XMLSerializer().serializeToString(svgDoc);
                  dataURL = 'data:image/svg+xml;charset=utf8,' + encodeURIComponent(svgData);
                } else if (renderer === 'canvas') {
                  dataURL = canvasDom.toDataURL('image/png');
                }

                window.chart.base64 = dataURL;
                // console.log(dataURL);
              }, 150);
            });
            line.on('afterpaint', () => {
              console.log('paint');
            });
            line.render();
            // console.log('render');
          })(this);
        `;
	await page.evaluate((scriptText) => {
		const el = document.createElement('script');
		el.type = 'text/javascript';
		el.textContent = scriptText;
		document.body.appendChild(el);
	}, scriptToInject);

  await page.waitForFunction('typeof window.chart.base64 !== "undefined"');
	// await page.waitForTimeout(150);
	// await page.screenshot({ type: 'png', path: 'screenshot.png' });
	// console.log((await page.content()).toString());

	let base64 = await page.evaluate(() => {
		if (!window.chart || typeof window.chart.base64 === 'undefined') {
			return null;
		}
		const dataURL = window.chart.base64.split(',');
		// console.log('base', dataURL[0], dataURL[1].length);
		return dataURL[1];
	});
	// console.log(base64);
	//await page.screenshot({path:'example.png'});
	await browser.close();
	return base64;
};

exports.render_g = render;
