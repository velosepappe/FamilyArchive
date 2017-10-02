$(document).ready(function(){
	getPhoto();
	$("#nextButton").click(function() {getPhotoWithOffset(1)});
	$("#previousButton").click(function() {getPhotoWithOffset(-1)});
	$("#submitPath").click(function() {currentPath = $("#inputPath").val(); nextPhotoIndex = 0; getPhoto();});
	$("#submitPerson").click(function() {createNewPerson($("#newPerson").val());});
	$("#submitLocation").click(function() {createNewLocation($("#newLocation").val())});
	$("#attachLocation").click(function() {attachLocation();});
});
var nextPhotoIndex = 0;
var currentPath="";
var map;
var selectedLocation;
var currentPhoto;

var markers = {};
var selectedMarker;

function myMap() {
	var mapProp= {
			center:new google.maps.LatLng(51.053889, 3.705),
			zoom:3,
		};
	map=new google.maps.Map(document.getElementById("googleMap"),mapProp);
	
	
	$.get( "http://localhost:7200/repositories/Test",{query:"select ?a ?name ?lat ?lng where {?a <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.org/Place>; <http://schema.org/name> ?name; <http://schema.org/geo> ?geo. ?geo <http://schema.org/latitude> ?lat; <http://schema.org/longitude> ?lng.}"}).done(function(data) {
		list = CSVToArray(data,",");
		$.each(list, function(index, value){
			if(index >0){
				addLocation(value[0], value[1], value[2], value[3]);
			}
		});
	});
}
function addLocation(uri, name, lat, lng){
	var location = new google.maps.LatLng(lat, lng);

	marker = new google.maps.Marker({position: location,map: map, title:name});
	marker.addListener('click',function(){
		selectedLocation = uri;
		if(selectedMarker != null){
			selectedMarker.setAnimation(null);
		}
		selectedMarker = this;
		selectedMarker.setAnimation(google.maps.Animation.BOUNCE);
	});
	markers[uri] = marker;
}

function attachLocation(){
	if(selectedLocation != null){
		$.post( "http://localhost:7200/repositories/Test/statements", { update:"delete {<"+currentPhoto[0]+">  <http://purl.org/dc/terms/spatial> ?c} insert{<"+currentPhoto[0]+">  <http://purl.org/dc/terms/spatial> <"+selectedLocation+">} where {OPTIONAL{<"+currentPhoto[0]+"> <http://purl.org/dc/terms/spatial> ?c}.}"} )
		  .done(function( data ) {displayLocationsToSelect(currentPhoto[0]);});
	}
}

function createNewLocation(geoNamesUrl){
	splits = geoNamesUrl.split('/');
	if(splits[2] == "www.geonames.org"){
		$.get( "http://www.geonames.org/getJSON", {geonameId:splits[3], username:'velosepappe'}).done(function( geodata ) {
			$.post( "http://localhost:7200/repositories/Test/statements", { update:getCreateNewLocationRequest(geoNamesUrl, "http://www.geonames.org/"+geoNamesUrl.split('/')[3], geodata['name'], geodata['lat'],geodata['lng'] )} )
			  .done(function( d ) {
				  addLocation(geoNamesUrl, geodata['name'], geodata['lat'], geodata['lng']);
			  });
		});
	}
}

function getCreateNewLocationRequest(uri, geoCoordinatesUri, name, lat, lng){
	return "insert{<"+uri+"> <http://schema.org/geo> <"+geoCoordinatesUri+">; a <http://schema.org/Place>;<http://schema.org/name> \""+name+"\". <"+geoCoordinatesUri+"> a <http://schema.org/GeoCoordinates>; <http://schema.org/latitude> "+lat+"; <http://schema.org/longitude> "+lng+";} where {}";
}

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
		$.each(list, function(index, value){
			if(index == 1){
				currentPhoto = value;
				displayPhoto(value);
				displayPersonsToSelect(value);
				displayLocation(value);
				displayEvent(value);
				processResourceViewed(value);
				displayLocationsToSelect(value);
			}
		});
	});
}

function processResourceViewed(photoDetails){
	incrementTimesViewed(photoDetails);
	updateLastViewed(photoDetails);
}

function incrementTimesViewed(photoDetails){
	$.get( "http://localhost:7200/repositories/Test", { query:getTimesViewedFromDocRequest(photoDetails[0])} ).done(function( data ) {
		timesViewed = CSVToArray(data,",")[1][0];
		$.post( "http://localhost:7200/repositories/Test/statements", { update:getUpdateTimesViewedFromDocRequest(photoDetails[0], parseInt(timesViewed))} );
	});
}

function getTimesViewedFromDocRequest(docUrl){
	return "select * where {  <"+ docUrl +"> <http://example.com/doc/timesviewed> ?s .} limit 100 ";
}

function getUpdateTimesViewedFromDocRequest(docUrl, timesViewed){
	return "delete {<"+ docUrl +"> <http://example.com/doc/timesviewed> "+ timesViewed +".}insert {   <"+ docUrl +"> <http://example.com/doc/timesviewed> "+ (timesViewed + 1) +".} where {<"+ docUrl +"> <http://example.com/doc/timesviewed> "+ timesViewed +".}"
}

function updateLastViewed(photoDetails){
	$.post( "http://localhost:7200/repositories/Test/statements", { update:getUpdateLastViewedFromDocRequest(photoDetails[0])} );
}

function getUpdateLastViewedFromDocRequest(docUrl){
	now = new Date();
	return 	"prefix spif: <http://spinrdf.org/spif#> delete {<"+ docUrl +"> <http://example.com/doc/lastviewed> ?last.}insert {   <"+ docUrl +"> <http://example.com/doc/lastviewed> \"" + now.toISOString() + "\"^^xsd:dateTime.} where {OPTIONAL{<"+ docUrl +"> <http://example.com/doc/lastviewed> ?last.}}"
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
		if(urlParts[urlParts.length-1] == "jpg" || urlParts[urlParts.length-1] == "JPG" || urlParts[urlParts.length-1] == "png"){
			return $("<img>").attr("src",url).attr("alt",url);
		}
		else if(urlParts[urlParts.length-1] == "mp4"){
			return $('<video />', {
				src: url,
				type: 'video/mp4',
				controls: true
			});
		}
		else return $("<h4>").text("FOLDER " + url);
	}
	
}

function getPersonsFromDocRequest(docUrl){
	return "select * where { <"+ docUrl +"> <http://xmlns.com/foaf/0.1/depicts> ?s .}";
}



function getAllPersonsAndPresentToDocRequest(doc){
	request = "select ?pers ?depicts ( count ( ?c ) as ?cnt)  where {?pers <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.com/person/person>. OPTIONAL {<" + doc[0] + "> ?depicts ?pers.}" ;
	request += " optional { ?c ";
	fragments = currentPath.split("\\");
	if(fragments.length >=1){
		for(f = 1; f < fragments.length; f++){
			request += "<http://example.com/doc/folder"+(f-1)+"> \"" + fragments[f] + "\"";
			if(f == fragments-1){
				request += ". ";
			}
			else{
				request += "; ";
			}
		}
	}
	
	request += "<http://xmlns.com/foaf/0.1/depicts> ?pers. } } group by ?pers ?depicts order by desc(?depicts) desc(?cnt)";
	return request;
	
}

function getAllLocationsAndPresentToDocRequest(doc){
	request = "select ?loc ?name ?lat ?lng ?spatial ( count ( ?c ) as ?cnt)  where {?loc <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://schema.org/Place>; <http://schema.org/geo> ?geo; <http://schema.org/name> ?name. ?geo <http://schema.org/latitude> ?lat; <http://schema.org/longitude> ?lng. OPTIONAL {<" + doc[0] + "> ?spatial ?loc.}" ;
	request += " optional { ?c ";
	fragments = currentPath.split("\\");
	if(fragments.length >=1){
		for(f = 1; f < fragments.length; f++){
			request += "<http://example.com/doc/folder"+(f-1)+"> \"" + fragments[f] + "\"";
			if(f == fragments-1){
				request += ". ";
			}
			else{
				request += "; ";
			}
		}
	}
	
	request += "<http://purl.org/dc/terms/spatial> ?loc. } } group by ?loc ?name ?lat ?lng ?spatial ?depicts order by desc(?spatial) desc(?cnt)";
	return request;
	
}
function displayLocationsToSelect(photoDetails){
	$.get( "http://localhost:7200/repositories/Test", { query:getAllLocationsAndPresentToDocRequest(photoDetails)} )
	  .done(function( data ) {
		  list = CSVToArray(data,",");
		console.log( list );
		$.each(list, function(index, location){
			if(index > 0){
				if(location[4]){
					markers[location[0]].setIcon('http://maps.google.com/mapfiles/ms/icons/yellow-dot.png');					
				}
				else if(location[5] > 0){
					markers[location[0]].setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png');
				}
				else{
					markers[location[0]].setIcon('http://maps.google.com/mapfiles/ms/icons/red-dot.png');
				}
			}
		});
	});
}

function displayPersonsToSelect(photoDetails){
	$.get( "http://localhost:7200/repositories/Test", { query:getAllPersonsAndPresentToDocRequest(photoDetails)} )
	  .done(function( data ) {
		  list = CSVToArray(data,",");
		$("#selectPersons").empty();
		$.each(list, function(index, personUri){
			if(index > 0){
				person = $("<div>").addClass("selectPerson");
				person.appendTo($("#selectPersons"));
				personImageButton = $("<div>").addClass("button inline");
				personImageButton.appendTo(person);
				$("<div>").addClass("inline").text(personUri[0] + " (" + personUri[2] + ")").appendTo(person);
				if(personUri[1] == "http://xmlns.com/foaf/0.1/depicts"){
					person.addClass("present");
					personImageButton.text("Verwijder").click(function(){removePersonFromPhoto(photoDetails,personUri[0])});
				}
				else{
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
		$.each(list, function(index, value){
			if(index >= 1){
				element.append("<p>" + value[0] + "</p>");
			}
		});
}

function addPersonToPhoto(photoURI,personUri){
	$.post( "http://localhost:7200/repositories/Test/statements", { update:getAddPersonToDocRequest(photoURI[0],personUri)} )
	  .done(function( data ) {displayPersonsToSelect(photoURI);});
}

function getAddPersonToDocRequest(docUrl, personUrl){
	return "insert { <" + docUrl + "> <http://xmlns.com/foaf/0.1/depicts> <" + personUrl + "> } where{} ";
}

function removePersonFromPhoto(photoURI,personUri){
	$.post( "http://localhost:7200/repositories/Test/statements", { update:getRemovePersonFromDocRequest(photoURI[0],personUri)} )
	  .done(function( data ) {displayPersonsToSelect(photoURI);});
}

function getRemovePersonFromDocRequest(docUrl, personUrl){
	return "delete { <" + docUrl + "> <http://xmlns.com/foaf/0.1/depicts> <" + personUrl + "> } where{} ";
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