// Set graph dimensions and margins
var margin = {top: 50, right: 20, bottom: 110, left: 40},
    width = 1200 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;

// Targets for filtering data
var targetState = "California";
var targetState2 = "Minnesota";

// Time parser
var parseTime = d3.timeParse("%Y%B");

// Set ranges
var x = d3.scaleTime()
          .range([0, width])
var y = d3.scaleLinear()
          .range([height, 0]);

// Define line
var line = d3.line()
    .x(function(d) {
      return x(d.time);
    })
    .y(function(d) {
      return y(d.handgun_incidents);
    });
          
// Appends an svg to the body and a group which is moved to the top left margin
var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", 
          "translate(" + margin.left + "," + margin.top + ")");


// Get data
d3.csv("parsed_data.csv", function(error, data) {
  if (error) throw error;

  // Filters the data to a manageable chunk
  var newData = data.filter(function filterCriteria(d) {
    return (d.state == targetState);
  });

  var newData2 = data.filter(function(d) {
    return (d.state == targetState2);
  })

  // Formats data
  newData.forEach(function(d) {
    d.time = parseTime(d.year + d.month);
    d.handgun_incidents = +d.handgun_incidents;
  })

  newData2.forEach(function(d) {
    d.time = parseTime(d.year + d.month);
    d.handgun_incidents = +d.handgun_incidents;
  })
	
  // Scale the range of the data in the domains
  x.domain(d3.extent(newData, function(d) {
    return d.time; 
  }));
  y.domain([0, d3.max(newData, function(d) {
    return d.handgun_incidents; 
  })]);

  // Appends the path of the line
  svg.append("path")
    .data([newData])
    .attr("class", "line")
    .attr("d", line);

  svg.append("text")
    .attr("x", x(newData[newData.length - 1].time))
    .attr("y", y(newData[newData.length - 1].handgun_incidents) + 8)
    .attr("text-anchor", "end")
    .text(targetState);

    // Appends the path of the line
  svg.append("path")
    .data([newData2])
    .attr("class", "line")
    .attr("d", line);

  svg.append("text")
    .attr("x", x(newData2[newData2.length - 1].time))
    .attr("y", y(newData2[newData2.length - 1].handgun_incidents) - 5)
    .attr("text-anchor", "end")
    .text(targetState2);

  // X axis
  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  // Y Axis
  svg.append("g")
      .call(d3.axisLeft(y));

  // Make a title
  svg.append("text")
      .attr("x", (width / 2))
      .attr("y", 0 - (margin.top / 2))
      .attr("text-anchor", "middle")
      .style("font-size", "20px")
      .text("Number of Homicides by Handgun in " + targetState +  " and " + targetState2 + " Over Time");

});