// topojson data taken from https://github.com/deldersveld/topojson -- map without antarctica
const url = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries-sans-antarctica.json";
//constants
const height = 800;
const noDataCountries = "#A9A9A9";
const defaultYear = 1985;
const maxSuicides = 61500; // refer to clean.py
const maxRate = 52; // refer to clean.py
const colorTotal = d3.scaleLinear()
    .domain([0, maxSuicides])
    .range([255,0]);
const colorRate = d3.scaleLinear()
    .domain([0,maxRate])
    .range([255,0]);
const scaleTotal = d3.scaleLinear()
    .domain([maxSuicides,0])
    .range([0, height - 15]);
const scaleRate = d3.scaleLinear()
    .domain([maxRate,0])
    .range([0, height - 15]);

// variables
var mapData;
var suicideData;
var svg;
var countries;
var currentYearData;
var prevRadio;
var choice = "total";
var currentYear;
var legend;

// Starting point for the app -- initializes site and pulls data
function init() {
    document.forms.form.addEventListener("change", function(item) {
        if(item.target.name == "radios") {
            prevRadio = item.target;
            choice = prevRadio.value;
            selectYear(currentYear);
            setScale();
        }
    })
    d3.json(url).then(topojson => {
        mapData = topojson;
        return d3.json("data/json/cyanide.json");
    }).then(data => {
        suicideData = data;
        createSVG();
        createSlider();
        createLegend();
        selectYear(defaultYear);
        return 1;
    })
}

// creating map, panning and zoom -- taken from LV5-Z4
function createSVG() {
    const width = document.getElementById("map").clientWidth;

    const projection = d3.geoMercator()
        .center([0,40])
        .scale(180)
        .translate([width/2, height/2]);

    const path = d3.geoPath()
        .projection(projection);
    
    svg = d3.select("#map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("stroke", "black")

    countries = svg.selectAll("svg.country")
        .data(topojson.feature(mapData, mapData.objects.countries1).features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", path)
        .style("stroke", "gray")
        .style("stroke-width", 1)
        .on("click", country => setInfo(country));

    var zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", zoomed);

    svg.call(zoom);
}

function zoomed() {
    svg.selectAll("path")
        .attr("transform", d3.event.transform);
}

// time slider taken from https://bl.ocks.org/johnwalley/e1d256b81e51da68f7feb632a53c3518
function createSlider() {
    const min = 1985;
    const max = 2016;
    const width = document.getElementById("slider-time").clientWidth;
    var sliderTime = d3.sliderBottom()
        .min(min)
        .max(max)
        .width(width - 50)
        .tickFormat(d3.format(''))
        .ticks(max - min)
        .step(1)
        .default(defaultYear)
        .on("onchange", year => selectYear(year));

    const gStep = d3.select("div#slider-time")
        .append("svg")
        .attr("width", width)
        .attr("height", 100)
        .append("g")
        .attr('transform', 'translate(30,30)');

    gStep.call(sliderTime);
}

// placed in a separate function so it can be called to set default values
function selectYear(year) {
    currentYearData = suicideData.filter(item => item.year == year);
    currentYear = year;
    countries.each(function(d) {
        const suicides = getData(d.properties.name);
        d3.select(this).style("fill", suicides ? colorScaleSuicides(suicides) : noDataCountries)
    });
}

function getData(val) {
    const data = currentYearData.find(item => item.country == val);
    if(choice == "total") {
        if(data) {
            value = data.suicides
            return isNaN(value) ? false : value;
        } else {
            return false;
        }
    } else {
        if(data) {
            value = data.rate
            return isNaN(value) ? false : value;
        } else {
            return false;
        }
    } 
}

function colorScaleSuicides(suicides) {
    var hex;
    if(choice == "total") {
        hex = Math.trunc(colorTotal(suicides)).toString(16);
    } else {
        hex = Math.trunc(colorRate(suicides)).toString(16);
    }
    hex.length == 1 ? hex = "0" + hex : hex = hex;
    var x = "ff" + hex + hex;
    return x;
}

// legend taken from https://bl.ocks.org/HarryStevens/6eb89487fc99ad016723b901cbd57fde
function createLegend() {
    legend = d3.select("#legend")
        .append("svg")
        .attr("width", 100)
        .attr("height", height);

    const defs = legend.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "gradient")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "100%")
        .attr("y2", "0%");

    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#ffffff");

    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#ff0000")

    legend.append("rect")
        .attr("width", 25)
        .attr("height", height)
        .attr("transform", "translate(0, 10)")
        .style("fill", "url(#gradient)")
        .style("stroke", "black")

    setScale();
}

function setScale() {
    legend.selectAll("g").remove();

    chosenScale = getScale();

    const yAxis = d3.axisRight()
    .scale(chosenScale)
    .ticks(15)
    .tickFormat((d) => d);

    legend.append("g")
        .attr("transform", "translate(25,10)")
        .call(yAxis);
}

function getScale() {
    if(choice == "total") {
        return scaleTotal;
    } else {
        return scaleRate;
    }
}

function setInfo(country) {
    const data = currentYearData.find(item => item.country == country.properties.name);
    var info = d3.select("#info");

    var innerHTML = 
        "<h4>" + data.country + " - " + data.year + "</h4>" +
        "<p><b>Population:</b> " + data.population + "</p>" +
        "<p><b>Total number of suicides:</b> " + data.suicides + "</p>" +
        "<p><b>Suicide rate per 100,000 population:</b> " + data.rate + "</p>";
        
    info.html(innerHTML);
}

// initialize
init();