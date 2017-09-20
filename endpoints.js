$(document).ready(function(){
	getPhoto();
	$("#nextButton").click(function() {getPhotoWithOffset(1)});
	$("#previousButton").click(function() {getPhotoWithOffset(-1)});
	$("#submitPath").click(function() {currentPath = $("#inputPath").val(); nextPhotoIndex = 0; getPhoto();});
});

var nextPhotoIndex = 0;
var currentPath="";

function getPhotoUrlRequest(offset){
	fragments = currentPath.split("\\");
	request = "select * where { 	?a <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.com/doc/doc> ";
	f = 0;
	if(fragments.length > 1){
		for(; f < fragments.length-1; f++){
			request += "; <http://example.com/doc/folder"+f+"> \"" + fragments[f+1] + "\"";
		}
		request +=".";
	}
	for(; f <6; f++){
		request += "OPTIONAL{?a <http://example.com/doc/folder"+f+"> ?f" + f + ".} ";
	}
	
	request += "} LIMIT 1 OFFSET " + offset;
	return request;
}

function getPersonsFromDocRequest(docUrl){
	return "select * where { ?s <http://example.com/person/depiction> <"+ docUrl +"> .} limit 100 ";
}

function getLocationsFromDocRequest(docUrl){
	return "select * where {  <"+ docUrl +"> <http://purl.org/dc/terms/spatial> ?s .} limit 100 ";
}


function getEventsFromDocRequest(docUrl){
	return "select * where {  <"+ docUrl +"> <http://example.com/doc/recordEvent> ?s .} limit 100 ";
}

function getPhotoWithOffset(offset){
	nextPhotoIndex = nextPhotoIndex +offset;
	getPhoto();	
}

function getPhoto(){
	$.get( "http://localhost:7200/repositories/Test", { query:getPhotoUrlRequest(nextPhotoIndex)} )
	  .done(function( data ) {
		  list = CSVToArray(data,",");
		console.log( CSVToArray(data,",") );
		$.each(list, function(index, value){
			if(index == 1){
				
				displayPhoto(value);
				displayPersons(value);
				displayLocation(value);
				displayEvent(value);
			}
		});
	});
}

function displayPhoto(value){
	$("#photo").empty();
	
	url = "file:///";
	url += currentPath==""?"E:":currentPath;
	$.each(value, function(folder, foldername){
		if(folder > 0 && foldername != ""){
			url = url + "/" + foldername;
		}
	});
	url = encodeURI(url);
	$("#photo").append("<img src="+url+" width = '500px'></img>");
}

function displayPersons(value){
	$("#persons").empty();
	$.get( "http://localhost:7200/repositories/Test", { query:getPersonsFromDocRequest(value[0])} )
	  .done(function( data ) {
		populateFrame($("#persons"), data);
	});
}

function displayLocation(value){
	$("#location").empty();
	$.get( "http://localhost:7200/repositories/Test", { query:getLocationsFromDocRequest(value[0])} )
	  .done(function( data ) {
		populateFrame($("#location"), data);
	});
}

function displayEvent(value){
	$("#event").empty();
	$.get( "http://localhost:7200/repositories/Test", { query:getEventsFromDocRequest(value[0])} )
	  .done(function( data ) {
		populateFrame($("#event"), data);
	});
}

function populateFrame(element, data){
	  list = CSVToArray(data,",");
		console.log( CSVToArray(data,",") );
		$.each(list, function(index, value){
			if(index >= 1){
				element.append("<p>" + value[0] + "</p>");
			}
		});
}

function getAllPersons(){
	$.get( "http://localhost:7200/repositories/Test", { query:"select ?a where {?a <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.com/person/person>}"} )
	  .done(function( data ) {
		  list = CSVToArray(data,",");
		console.log( CSVToArray(data,",") );
		$.each(list, function(index, value){
			if(index > 0){
				$("#photo").empty().append($("<div class="+value+">"+value+"</d>"));
			}
		});
	});
}

// ref: http://stackoverflow.com/a/1293163/2343
// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overriden in the second argument.
function CSVToArray( strData, strDelimiter ){
	// Check to see if the delimiter is defined. If not,
	// then default to comma.
	strDelimiter = (strDelimiter || ",");

	// Create a regular expression to parse the CSV values.
	var objPattern = new RegExp(
		(
			// Delimiters.
			"(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

			// Quoted fields.
			"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

			// Standard fields.
			"([^\"\\" + strDelimiter + "\\r\\n]*))"
		),
		"gi"
		);


	// Create an array to hold our data. Give the array
	// a default empty first row.
	var arrData = [[]];

	// Create an array to hold our individual pattern
	// matching groups.
	var arrMatches = null;


	// Keep looping over the regular expression matches
	// until we can no longer find a match.
	while (arrMatches = objPattern.exec( strData )){

		// Get the delimiter that was found.
		var strMatchedDelimiter = arrMatches[ 1 ];

		// Check to see if the given delimiter has a length
		// (is not the start of string) and if it matches
		// field delimiter. If id does not, then we know
		// that this delimiter is a row delimiter.
		if (
			strMatchedDelimiter.length &&
			strMatchedDelimiter !== strDelimiter
			){

			// Since we have reached a new row of data,
			// add an empty row to our data array.
			arrData.push( [] );

		}

		var strMatchedValue;

		// Now that we have our delimiter out of the way,
		// let's check to see which kind of value we
		// captured (quoted or unquoted).
		if (arrMatches[ 2 ]){

			// We found a quoted value. When we capture
			// this value, unescape any double quotes.
			strMatchedValue = arrMatches[ 2 ].replace(
				new RegExp( "\"\"", "g" ),
				"\""
				);

		} else {

			// We found a non-quoted value.
			strMatchedValue = arrMatches[ 3 ];

		}


		// Now that we have our value string, let's add
		// it to the data array.
		arrData[ arrData.length - 1 ].push( strMatchedValue );
	}

	// Return the parsed data.
	return( arrData );
}