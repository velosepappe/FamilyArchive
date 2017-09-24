$(document).ready(function(){
	getPhoto();
	$("#nextButton").click(function() {getPhotoWithOffset(1)});
	$("#previousButton").click(function() {getPhotoWithOffset(-1)});
	$("#submitPath").click(function() {currentPath = $("#inputPath").val(); nextPhotoIndex = 0; getPhoto();});
	$("#submitPerson").click(function() {createNewPerson($("#newPerson").val());});
});

var nextPhotoIndex = 0;
var currentPath="";

function createNewPerson(name){
		$.post( "http://localhost:7200/repositories/Test/statements", { update:getCreateNewPersonRequest(name)} )
	  .done(function( data ) {
		  getPhoto();
	  });
}
function getCreateNewPersonRequest(name){
	return "insert { <http://example.com/person/" + encodeURI(name.split(' ').join('+')) + "> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.com/person/person>. } where {}";

}
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
	for(; f <10; f++){
		request += "OPTIONAL{?a <http://example.com/doc/folder"+f+"> ?f" + f + ".} ";
	}
	
	request += "} LIMIT 1 OFFSET " + offset;
	return request;
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
				displayPersonsToSelect(value);
				displayLocation(value);
				displayEvent(value);
			}
		});
	});
}

function displayPhoto(photoDetails){
	$("#photo").empty();
	
	url = "file:///";
	url += currentPath==""?"E:":currentPath;
	$.each(photoDetails, function(folder, foldername){
		if(folder > 0 && foldername != ""){
			url = url + "/" + foldername;
		}
	});
	element = getDisplayElementforLocalPath(url);
	$("#photo").append(element);
}

function getDisplayElementforLocalPath(url){
	url = encodeURI(url);
	urlParts = url.split("\.");
	if(urlParts.length>1){
		if(urlParts[1] == "jpg" || urlParts[1] == "png"){
			return $("<img>").attr("src",url).attr("alt",url);
		}
		else if(urlParts[1] == "mp4"){
			return $('<video />', {
				src: url,
				type: 'video/mp4',
				controls: true
			});
		}
		else return $("<h4>").text("FOLDER " + url);
	}
	
}

function displayPersons(photoDetails){
	$("#persons").empty();
	$.get( "http://localhost:7200/repositories/Test", { query:getPersonsFromDocRequest(photoDetails[0])} )
	  .done(function( data ) {
		populateFrame($("#persons"), data);
	});
}

function getPersonsFromDocRequest(docUrl){
}

function getAllPersonsAndPresentToDocRequest(docUrl){
	return "select ?a ?b where {?a <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.com/person/person>. OPTIONAL {?a ?b <" + docUrl + ">}}"
}

function displayPersonsToSelect(photoDetails){
	$.get( "http://localhost:7200/repositories/Test", { query:getAllPersonsAndPresentToDocRequest(photoDetails[0])} )
	  .done(function( data ) {
		  list = CSVToArray(data,",");
		console.log( CSVToArray(data,",") );
		$("#selectPersons").empty();
		$.each(list, function(index, personUri){
			if(index > 0){
				person = $("<div>").addClass("selectPerson");
				personImageButton = $("<div>").addClass("button inline");
				personImageButton.appendTo(person);
				$("<div>").addClass("inline").text(personUri[0]).appendTo(person);
				if(personUri[1] == "http://example.com/person/depiction"){
					person.addClass("present").prependTo($("#selectPersons"));
					personImageButton.text("Verwijder").click(function(){removePersonFromPhoto(photoDetails,personUri[0])});
				}
				else{
					person.appendTo($("#selectPersons"));
					personImageButton.text("Voeg toe").click(function(){addPersonToPhoto(photoDetails,personUri[0])});
				}
			}
		});
	});
}

function displayLocation(photoDetails){
	$("#location").empty();
	$.get( "http://localhost:7200/repositories/Test", { query:getLocationsFromDocRequest(photoDetails[0])} )
	  .done(function( data ) {
		populateFrame($("#location"), data);
	});
}

function displayEvent(photoDetails){
	$("#event").empty();
	$.get( "http://localhost:7200/repositories/Test", { query:getEventsFromDocRequest(photoDetails[0])} )
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

function addPersonToPhoto(photoURI,personUri){
	$.post( "http://localhost:7200/repositories/Test/statements", { update:getAddPersonToDocRequest(photoURI[0],personUri)} )
	  .done(displayPersons(photoURI));
}

function getAddPersonToDocRequest(docUrl, personUrl){
	return "insert { <" + personUrl + "> <http://example.com/person/depiction> <" + docUrl + "> } where{} ";
}

function removePersonFromPhoto(photoURI,personUri){
	$.post( "http://localhost:7200/repositories/Test/statements", { update:getRemovePersonFromDocRequest(photoURI[0],personUri)} )
	  .done(displayPersons(photoURI));
}

function getRemovePersonFromDocRequest(docUrl, personUrl){
	return "delete { <" + personUrl + "> <http://example.com/person/depiction> <" + docUrl + "> } where{} ";
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