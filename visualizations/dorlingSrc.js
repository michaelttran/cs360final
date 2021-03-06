// var svg = d3.select("svg"),
//     width = +svg.attr("width"),
//     height = +svg.attr("height"),
//     radius = d3.scaleSqrt().range([0, 45]).clamp(true),
//     color = d3.scaleLinear();
// Set graph dimensions and margins
var margin = {top: 50, right: 20, bottom: 110, left: 0},
    width = 1200 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;


// Appends an svg to the body and a group which is moved to the top left margin
var svg = d3.select("body").append("svg")
    // .attr("width", width + margin.left + margin.right)
    // .attr("height", height + margin.top + margin.bottom)
    .attr("width", 960)
    .attr("height", 1200)
  .append("g")
    .attr("transform", 
          "translate(" + margin.left + "," + margin.top + ")");

var radius = d3.scaleSqrt().range([0, 45]).clamp(true),
    color = d3.scaleLinear();      


var stateLookup = ["Alaska", "Alabama", "Arkansas", "Arizona", "California", "Colorado", "Connecticut", "District of Columbia", "Delaware", "Florida", "Georgia", "Hawaii", "Iowa", "Idaho", "Illinois", "Indiana", "Kansas", "Kentucky", "Louisiana", "Massachusetts", "Maryland", "Maine", "Michigan", "Minnesota", "Missouri", "Mississippi", "Montana", "Nebraska", "North Carolina", "North Dakota", "New Hampshire", "New Jersey", "New Mexico", "Nevada", "New York", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhodes Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Virginia", "Vermont", "Washington", "Wisconsin", "West Virginia", "Wyoming"];

var addedStates = [];

var stateAbbrLookup = ["AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL",
 "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM",
  "NV", "NY", "OH", 'OK', "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI","WV", "WY"];

var weaponDict = [];

var rScale = d3.scaleLinear()
            .range([20, 150]);

color.domain([150, 20]); // Inverted radius range for the color domain

d3.csv("./data/parsed_data.csv", function(error, data) {
  if (error) throw error;

  // Formats data
  data.forEach(function(d) {
    d.total_incidents = +d.total_incidents;

    if (!addedStates.includes(d.state)) {
      addedStates.push(d.state);
      weaponDict.push({state : d.state, total_incidents : 0});
    }
    weaponDict[stateLookup.indexOf(d.state)].total_incidents += d.total_incidents;
  });

  rScale.domain([0, d3.max(weaponDict, function(d) { return d.total_incidents; })]);

  d3.json("./data/us_dorling.json", function(err, us) {
    var neighbors = topojson.neighbors(us.objects.states.geometries),
        nodes = topojson.feature(us, us.objects.states).features;

    nodes.forEach(function(node, i) {

      var centroid = d3.geoPath().centroid(node);

      node.x0 = centroid[0];
      node.y0 = centroid[1];

      node.incidents = weaponDict[stateAbbrLookup.indexOf(node.id + "")].total_incidents;

      cleanUpGeometry(node);

    });

    var states = svg.selectAll("path")
        .data(nodes)
        .enter()
        .append("path")
        .attr("d", pathString)
        .attr("fill", "#ccc");

    simulate();

    function simulate() {
      nodes.forEach(function(node) {
        node.x = node.x0;
        node.y = node.y0;
        node.r = rScale(node.incidents);
      });

      var links = d3.merge(neighbors.map(function(neighborSet, i) {
        return neighborSet.filter(j => nodes[j]).map(function(j) {
          return {source: i, target: j, distance: nodes[i].r + nodes[j].r + 3};
        });
      }));

      var simulation = d3.forceSimulation(nodes)
          .force("cx", d3.forceX().x(d => width / 2).strength(0.02))
          .force("cy", d3.forceY().y(d => height / 2).strength(0.02))
          .force("link", d3.forceLink(links).distance(d => d.distance))
          .force("x", d3.forceX().x(d => d.x).strength(0.1))
          .force("y", d3.forceY().y(d => d.y).strength(0.1))
          .force("collide", d3.forceCollide().strength(0.8).radius(d => d.r + 3))
          .stop();

      while (simulation.alpha() > 0.1) {
        simulation.tick();
      }

      nodes.forEach(function(node){
        var circle = pseudocircle(node),
            closestPoints = node.rings.slice(1).map(function(ring){
              var i = d3.scan(circle.map(point => distance(point, ring.centroid)));
              return ring.map(() => circle[i]);
            }),
            interpolator = d3.interpolateArray(node.rings, [circle, ...closestPoints]);

        node.interpolator = function(t){
          var str = pathString(interpolator(t));
          // Prevent some fill-rule flickering for MultiPolygons
          if (t > 0.99) {
            return str.split("Z")[0] + "Z";
          }
          return str;
        };
      });

      states
        .sort((a, b) => b.r - a.r)
        .transition()
        .delay(1000)
        .duration(1500)
        .attrTween("d", node => node.interpolator)
        .attr("fill", d => d3.interpolateRdYlBu(color(d.r)))
        .transition()
          .delay(1000)
          .attrTween("d", node => t => node.interpolator(1 - t))
          .attr("fill", "#ccc")
          .on("end", (d, i) => i || simulate());

    }

  });
});

function pseudocircle(node) {
  return node.rings[0].map(function(point){
    var angle = node.startingAngle - 2 * Math.PI * (point.along / node.perimeter);
    return [
      Math.cos(angle) * node.r + node.x,
      Math.sin(angle) * node.r + node.y
    ];
  });
}

function cleanUpGeometry(node) {

  node.rings = (node.geometry.type === "Polygon" ? [node.geometry.coordinates] : node.geometry.coordinates);

  node.rings = node.rings.map(function(polygon){
    polygon[0].area = d3.polygonArea(polygon[0]);
    polygon[0].centroid = d3.polygonCentroid(polygon[0]);
    return polygon[0];
  });

  node.rings.sort((a, b) => b.area - a.area);

  node.perimeter = d3.polygonLength(node.rings[0]);

  // Optional step, but makes for more circular circles
  bisect(node.rings[0], node.perimeter / 72);

  node.rings[0].reduce(function(prev, point){
    point.along = prev ? prev.along + distance(point, prev) : 0;
    node.perimeter = point.along;
    return point;
  }, null);

  node.startingAngle = Math.atan2(node.rings[0][0][1] - node.y0, node.rings[0][0][0] - node.x0);

}

function bisect(ring, maxSegmentLength) {
  for (var i = 0; i < ring.length; i++) {
    var a = ring[i], b = i === ring.length - 1 ? ring[0] : ring[i + 1];

    while (distance(a, b) > maxSegmentLength) {
      b = midpoint(a, b);
      ring.splice(i + 1, 0, b);
    }
  }
}

function distance(a, b) {
  return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]));
}

function midpoint(a, b) {
  return [a[0] + (b[0] - a[0]) * 0.5, a[1] + (b[1] - a[1]) * 0.5];
}

function pathString(d) {
  return (d.rings || d).map(ring => "M" + ring.join("L") + "Z").join(" ");
}