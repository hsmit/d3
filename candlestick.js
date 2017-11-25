// chart sizes
var space   = 7,
    margin  = {right: 90, bottom: 60}
    padding = {left: 5, right: 5, top: 5, bottom: 5},
    chart   = {width: 555, height: 360},
    dateAxisOffset = 35,
    minimumCandleHeight = 0.1;

var barWidth = 0;
var datasetComplete;
var dataset;

var autoYScale = false;

var stepSize = 30;
var dataRange = {min: -1300, max: -1200};
var originalSize = 0;

// svg chart
var svg = d3.select("body")
    .append("svg")
        .attr("width", chart.width + margin.right)
        .attr("height", chart.height + margin.bottom);

// scales (domain() values will be set after data is loaded)
var yScale = d3.scale.linear().range([chart.height, 0]);
var xScale = d3.time.scale().range([0, chart.width]);

// axis layout
var xAxisTime = d3.svg.axis().orient("bottom").ticks(8).tickFormat(d3.time.format("%H:%M"));
var xAxisDate = d3.svg.axis().orient("bottom").ticks(d3.time.days, 1).tickFormat(d3.time.format("%Y-%m-%d"));
var yAxis     = d3.svg.axis().orient("right").ticks(5).tickFormat(d3.format(".8f"));

// axis group (later it will call() the axis layouts)
var xAxisTimeGroup = svg.append("g")
    .attr("transform", "translate(" + padding.left + ", " + (chart.height + 10) + ")")
    .attr("id", "xAxisTimeGroup")
    .attr("class", "axis time");
var xAxisDateGroup = svg.append("g")
    .attr("transform", "translate(" + padding.left + ", " + (chart.height + dateAxisOffset) + ")")
    .attr("id", "xAxisDateGroup")
    .attr("class", "axis day");
var yAxisGroup = svg.append("g")
    .attr("transform", "translate(" + (padding.left + chart.width + padding.right)+ ", " + padding.top + ")")
    .attr("id", "yAxisGroup")
    .attr("class", "axis y");

// crosshairs
var crosshairGroup = svg.append('g')
    .attr("id", "crosshairGroup");
crosshairGroup.append('line')
    .attr('id', 'crosshairX')
    .attr('class', 'crosshair');
crosshairGroup.append('line')
    .attr('id', 'crosshairY')
    .attr('class', 'crosshair');

// register mouse-move event handler for crosshairs
svg.on("mousemove", function() {
    var [mouseX, mouseY] = d3.mouse(this);
    crosshairGroup.select("#crosshairX")
        .attr("x1", 0)
        .attr("x2", chart.width)
        .attr("y1", mouseY)
        .attr("y2", mouseY);
    crosshairGroup.select("#crosshairY")
        .attr("x1", mouseX)
        .attr("x2", mouseX)
        .attr("y1", 0)
        .attr("y2", chart.height);
});
// shadows
var shadowGroup = svg.append('g').attr("id", "shadowGroup");

// candles
var candleGroup = svg.append('g').attr("id", "candleGroup");

// data parser
var formatRow = function(d) {
    d.T = d3.time.format("%Y-%m-%dT%H:%M:%S").parse(d.T);
    d.bullish = d.O < d.C;
}

// functions to calculate new domains
var calcXDomain = function() {
    var [minDate, maxDate] = d3.extent(dataset, function(d) { return d.T;});
    var intervalMs = dataset[1].T.getTime() - dataset[0].T.getTime();
    return [
       new Date(minDate.getTime() - intervalMs/2),
       new Date(maxDate.getTime() + intervalMs/2)
    ];
}
var calcYDomain = function() {
    if (autoYScale) {
        return [
            d3.min(dataset, function(d) { return  d.L; }),
            d3.max(dataset, function(d) { return  d.H; })
        ];
    } else {
        return [
            d3.min(datasetComplete, function(d) { return  d.L; }),
            d3.max(datasetComplete, function(d) { return  d.H; })
        ];
    }
}

var candleAttrs = {
    class:  function(d) {return "candle " + (d.bullish ? "bullish" : "bearish");},
    transform: "translate(" + padding.left + ", " + padding.top + ")",
    x:      function(d) {return xScale(d.T)-(barWidth/2);},
    y:      function(d) {return Math.min(yScale(+d.O), yScale(+d.C));},
    height: function(d) {return Math.abs(yScale(d.O) - yScale(d.C)) + minimumCandleHeight;},
    width:  function(d) {return barWidth;}
}

var shadowAttrs = {
    class:          "shadow",
    transform:      "translate(" + padding.left + ", " + padding.top + ")",
    x1:             function(d) {return xScale(d.T);},
    y1:             function(d) {return yScale(d.H);},
    x2:             function(d) {return xScale(d.T);},
    y2:             function(d) {return yScale(d.L);},
    stroke:         "black",
    "stroke-width": "1"
}

// start loading the currency exchange dataset
d3.json("data/30minutes.json", function(data) {
    datasetComplete = data.result;
    originalSize = datasetComplete.length;
    dataset = data.result.slice(dataRange.min, dataRange.max); // use fragment
    // format dataset
    dataset.forEach(formatRow);
    // reset bar-width
    barWidth = (chart.width / dataset.length) - (space / 2);

    // recalculate scale.domain, the axis and their groups
    xScale.domain(calcXDomain())
    yScale.domain(calcYDomain())
    xAxisTime.scale(xScale);
    xAxisTimeGroup.call(xAxisTime);
    xAxisDate.scale(xScale);
    xAxisDateGroup.call(xAxisDate);
    yAxis.scale(yScale);
    yAxisGroup.call(yAxis);

    // draw shadow lines
    shadowGroup
        .selectAll("line.shadow")
        .data(dataset)
        .enter()
        .append("line")
            .attr(shadowAttrs);

    // draw candles
    candleGroup
        .selectAll("rect.candle")
        .data(dataset)
        .enter()
        .append("rect")
            .attr(candleAttrs);
});

function redrawData() {

    // reset bar-width
    barWidth = chart.width / dataset.length;

    // add new data to the candles
    var cd = svg.selectAll("rect.candle").data(dataset);
    cd.exit().remove();
    cd.enter().append("rect").attr(candleAttrs);

    // add new data to the shadows
    var ld = svg.selectAll("line.shadow").data(dataset);
    ld.exit().remove();
    ld.enter().append("line").attr(shadowAttrs);

    // Scale the range of the data again
    xScale.domain(calcXDomain());
    yScale.domain(calcYDomain());

    // Select the section we want to apply our changes to
    var chartTransition = svg.transition();
    var duration = 70;

    // update existing candles according to new scales
    //chartTransition.selectAll("rect.candle").duration(duration).attr(candleAttrs);
    svg.selectAll("rect.candle").transition().duration(duration).attr(candleAttrs);
    // update existing shadows according to new scales
    //chartTransition.selectAll("line.shadow").duration(duration).attr(shadowAttrs);
    svg.selectAll("line.shadow").transition().duration(duration).attr(shadowAttrs);

    // update axes
    chartTransition.select("#xAxisDateGroup").duration(duration)
        .call(xAxisDate);
    chartTransition.select("#xAxisTimeGroup").duration(duration)
        .call(xAxisTime);
    chartTransition.select("#yAxisGroup").duration(duration)
        .call(yAxis);
}

function moveRight() {
    // Get the data again
    d3.json("data/30minutes.json", function(error, data) {

        dataRange.min = dataRange.min+stepSize;
        dataRange.max = dataRange.max+stepSize;

        dataset = data.result.slice(dataRange.min, dataRange.max);
        dataset.forEach(formatRow);
        redrawData();
    });
}

function moveLeft() {
    // Get the data again
    d3.json("data/30minutes.json", function(error, data) {

        dataRange.min = dataRange.min-stepSize;
        dataRange.max = dataRange.max-stepSize;

        dataset = data.result.slice(dataRange.min, dataRange.max);
        dataset.forEach(formatRow);
        redrawData();
    });
}

function setAutoYScale() {
    autoYScale = !autoYScale;
    redrawData();
}