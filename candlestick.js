
// sizes
var marginRight = 90, marginBottom = 63, space = 4,
    paddingLeft = 5, paddingRight = 5, paddingTop = 5, paddingBottom = 5,
    chartWidth = 555, chartHeight = 360,
    yearOffset = 35,
    minimumCandleHeight = 0.1,
    svgWidth = chartWidth + marginRight,
    svgHeight = chartHeight + marginBottom;
var barWidth = 0;
var dataset;

// svg chart
var chart = d3.select("body")
    .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

// scale
var yScale = d3.scale.linear().range([chartHeight, 0]); // domain is dataset-dependent
var xScale = d3.time.scale().range([0, chartWidth]); // domain is dataset-dependent
// axis layout
var xAxisTime = d3.svg.axis().orient("bottom").ticks(8).tickFormat(d3.time.format("%H:%M"));
var xAxisDate = d3.svg.axis().orient("bottom").ticks(d3.time.days, 1).tickFormat(d3.time.format("%Y-%m-%d"));
var yAxis = d3.svg.axis().orient("right").ticks(5).tickFormat(d3.format(".8f"));
// axis group
var xAxisTimeGroup = chart.append("g")
    .attr("transform", "translate("+paddingLeft+", " + (chartHeight+10)+ ")")
    .attr("id", "xAxisTimeGroup")
    .attr("class", "axis time");
var xAxisDateGroup = chart.append("g")
    .attr("transform", "translate("+paddingLeft+", " + (chartHeight+yearOffset)+ ")")
    .attr("id", "xAxisDateGroup")
    .attr("class", "axis day");
var yAxisGroup = chart.append("g")
    .attr("transform", "translate(" + (paddingLeft + chartWidth + paddingRight)+ ", " + paddingTop + " )")
    .attr("id", "yAxisGroup")
    .attr("class", "axis y");

var formatRow = function(d) {
    d.L = +d.L;
    d.H = +d.H;
    d.O = +d.O;
    d.C = +d.C;
    d.V = +d.V;
    d.BV = +d.BV;
    d.T = d3.time.format("%Y-%m-%dT%H:%M:%S").parse(d.T);
    d.bullish = d.O < d.C;
}
var setXDomain = function(scale, dataset) {
        var [minDate, maxDate] = d3.extent(dataset, function(d) { return d.T;});
        var intervalMs = dataset[1].T.getTime() - dataset[0].T.getTime();
        var minDate2 = new Date(minDate.getTime() - intervalMs/2);
        var maxDate2 = new Date(maxDate.getTime() + intervalMs/2);
        scale.domain([minDate2, maxDate2]);
}

var setYDomain = function(scale, dataset) {
        var min = d3.min(dataset, function(d) { return  d.L; });
        var max = d3.max(dataset, function(d) { return  d.H; });
        scale.domain([min, max]);
}

var candleAttrs = {
    class: function(d) {
        return "candle " + (d.bullish ? "bullish" : "bearish");},
    x: function(d) {return xScale(d.T)-(barWidth/2);},
    y: function(d) {return Math.min(yScale(+d.O), yScale(+d.C));},
    height: function(d) {return Math.abs(yScale(d.O) - yScale(d.C)) + minimumCandleHeight;},
    width: function(d) {return barWidth;},
}

d3.json("data/30minutes.json", function(data) {
    // dataset from currency exchange
    dataset = data.result.slice(-100, -1);
    // format dataset
    dataset.forEach(formatRow);
    // data analysis
    var min = d3.min(dataset, function(d) { return  d.L; });
    var max = d3.max(dataset, function(d) { return  d.H; });
    var [minDate, maxDate] = d3.extent(dataset, function(d) { return d.T;});
    var bins = dataset.length;
    barWidth = (chartWidth/bins) - (space/2);
    var intervalMs = dataset[1].T.getTime() - dataset[0].T.getTime();
    var minDate2 = new Date(minDate.getTime() - intervalMs/2);
    var maxDate2 = new Date(maxDate.getTime() + intervalMs/2);


    // scales
    setYDomain(yScale, dataset);
    setXDomain(xScale, dataset);

    // crosshairs
    var focus = chart.append('g')
        .attr("id", "crosshairGroup");
    focus.append('line')
        .attr('id', 'crosshairX')
        .attr('class', 'crosshair');
    focus.append('line')
        .attr('id', 'crosshairY')
        .attr('class', 'crosshair');
    chart.on("mousemove", function() {
        var [mouseX, mouseY] = d3.mouse(this);
        focus.select("#crosshairX")
            .attr("x1", 0)
            .attr("x2", chartWidth)
            .attr("y1", mouseY)
            .attr("y2", mouseY);
        focus.select("#crosshairY")
            .attr("x1", mouseX)
            .attr("x2", mouseX)
            .attr("y1", 0)
            .attr("y2", chartHeight);
    });


    // draw axis
    // Y axis
    yAxis.scale(yScale);
    yAxisGroup.call(yAxis);
    // X axis - minutes
    xAxisTime.scale(xScale);
    xAxisTimeGroup.call(xAxisTime);
    // X axis - date
    xAxisDate.scale(xScale);
    xAxisDateGroup.call(xAxisDate);


    // shadow lines
    chart.append('g').attr("id", "shadowGroup")
        .selectAll("line.shadow")
        .data(dataset)
        .enter()
        .append("line")
            .attr("class", "shadow")
            .attr("transform", "translate(" + paddingLeft + ", " + paddingTop + ")")
            .attr("x1", function(d) {return xScale(d.T);})
            .attr("y1", function(d) {return yScale(d.H);})
            .attr("x2", function(d) {return xScale(d.T);})
            .attr("y2", function(d) {return yScale(d.L);})
            .attr("stroke", "black")
            .attr("stroke-width", 1);

    // candles
    chart.append('g').attr("id", "candleGroup")
        .selectAll("rect.candle")
        .data(dataset)
        .enter()
        .append("rect")
            .attr("transform", "translate(" + paddingLeft + ", " + paddingTop + ")")
            .attr(candleAttrs);
});

function updateData() {
    // Get the data again
    d3.json("data/30minutes.json", function(error, data) {
        var newDataset = data.result.slice(-300, -1);
        newDataset.forEach(function(d) {formatRow(d); dataset.push(d);});
        barWidth = chartWidth / dataset.length;

        // Scale the range of the data again
        setXDomain(xScale, dataset);
        setYDomain(yScale, dataset);

        // Select the section we want to apply our changes to
        var chartTransition = chart.transition();
        var duration = 750;

        // update existing candles
        /*
        var z = chart.selectAll("rect.candle")
            .data(dataset)
            .enter()
            .append("rect");
        z.transition().duration(duration)
            .attr(candleAttrs);
             */
        chartTransition.selectAll("rect.candle").duration(duration)
            .attr(candleAttrs);
        // update existing shadows
        chartTransition.selectAll("line.shadow").duration(duration)
            .attr("x1", function(d) {return xScale(d.T);})
            .attr("y1", function(d) {return yScale(d.H);})
            .attr("x2", function(d) {return xScale(d.T);})
            .attr("y2", function(d) {return yScale(d.L);})
        // update axes
        chartTransition.select("#xAxisDateGroup").duration(duration).call(xAxisDate);
        chartTransition.select("#xAxisTimeGroup").duration(duration).call(xAxisTime);
        chartTransition.select("#yAxisGroup").duration(duration).call(yAxis);

    });
}