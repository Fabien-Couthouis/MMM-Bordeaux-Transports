//Node_helper for : MMM-Bordeaux-Transport

//Modules nodejs requis par le node helper
var NodeHelper = require("node_helper");
var request = require('request');

module.exports = NodeHelper.create({

  // À exécuter lors du démarrage du miroir
  start: function() {
    console.log("MMM-Bordeaux-Transports helper started ...");
  },


  //Exemple de requête via url
  navitiaRequest: function() {

    let from = this.config.homeLongitude + "%3B" + this.config.homeLatitude;
    let to = this.config.eventAddressGPS;
    
    let nowURL = "https://api.navitia.io/v1/coverage/fr-sw/journeys?from=" + from + "&to=" + to + "&datetime_represents=arrival&datetime=" + this.config.arrivalTime + "&";
    //allowed_id%5B%5D=physical_mode%3ATramway& si on veut qu'un mode de transport

    console.log(nowURL);
    let self = this;

    //imbrication de 3 requêtes pour récup les 3 meilleurs possibilités de transports
    //TRANSPORT N
    let options = { url: nowURL, auth: { username: this.config.navitiaKey, password: this.config.mdp }};
    request.get(options, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        return console.log(error || { statusCode: response.statusCode });
      }
      else {
        //Traiter notre réponse "body", qui est le contenu de "response", on récupère ce dont on a besoin
        nowRes = JSON.parse(body);

        let preURL = ""; if (nowRes["links"][1]["type"] == "prev") {preURL = nowRes["links"][0]["href"];}
        let nexURL = ""; if (nowRes["links"][0]["type"] == "next") {preURL = nowRes["links"][1]["href"];}
        
        nowRes = self.etapesTransport(nowRes);

        if (preURL == "") { //si on n'a pas trouvé de link "prev"
          let payload = [nowRes];
          self.sendSocketNotification("NAVITIA_RESULT", payload);
          return;
        }


        //TRANSPORT N-1
        options = { url: preURL, auth: { username: self.config.navitiaKey, password: self.config.mdp }};
        request.get(options, function(error, response, body) {
          if (error || response.statusCode !== 200) {
            return console.log(error || { statusCode: response.statusCode });
          }
          else {
            preRes = JSON.parse(body);
            preRes = self.etapesTransport(preRes);


            //TRANSPORT N+1
            options = { url: nexURL, auth: { username: self.config.navitiaKey, password: self.config.mdp }};
            request.get(options, function(error, response, body) {
              if (error || response.statusCode !== 200) {
                return console.log(error || { statusCode: response.statusCode });
              }
              else {
                nexRes = JSON.parse(body);
                nexRes = self.etapesTransport(nexRes);

                console.log("-------------------------------------------------------------------");
                console.log(nowRes);
                console.log("-------------------------------------------------------------------");                
                console.log(preRes);
                console.log("-------------------------------------------------------------------");                
                console.log(nexRes);
                console.log("-------------------------------------------------------------------");                
                
                let payload = [nowRes, preRes, nexRes];
                self.sendSocketNotification("NAVITIA_RESULT", payload);
              }
            });
          }
        });
      }
    });
  },

  etapesTransport: function(resultat) {

    let trajet;
    //on sélectionne le plus rapide par défaut, à modifier selon besoin
    for (num in resultat["journeys"]) {
      if (resultat["journeys"][num]["type"] == "rapid") {
        trajet = resultat["journeys"][num];
      }
    }
    if (typeof trajet == "undefined") { //si on n'a pas trouvé de "rapid", on récup le premier journey proposé
      trajet = resultat["journeys"][0];
    }



    let nextTransTime; let nextTransArrivalName; let nextTrans;
    let ligneName; let etape;

    let etapesTransport = [];

    if (trajet["sections"].length == 1) { //si un une seule étape dans le journey, donc très probablement de la marche proposée
      nextTrans = "Partez à pied ";
      nextTransTime = trajet["sections"][0]["departure_date_time"].substring(9, 13); nextTransTime = nextTransTime.substring(0, 2) + "h" + nextTransTime.substring(2);;
      nextTransArrivalName = "";
      nextTransArrivalTime = "Trajet de " + Math.floor(trajet["sections"][0]["duration"]/60) + " minute(s)";

      etapesTransport.push({nextTrans, nextTransTime, nextTransArrivalName, nextTransArrivalTime});
      return etapesTransport;      
    }

    //sinon ...
    for (num in trajet["sections"]) {
      etape = trajet["sections"][num];

      if (etape["type"] == "public_transport") {

        nextTrans = etape["display_informations"]["name"] + " - " + etape["from"]["stop_point"]["name"] + " (> " + etape["display_informations"]["headsign"] + ")";
        nextTransTime = etape["departure_date_time"].substring(9, 13); nextTransTime = nextTransTime.substring(0, 2) + "h" + nextTransTime.substring(2);
        nextTransArrivalName = etape["to"]["stop_point"]["name"];
        nextTransArrivalTime = etape["arrival_date_time"].substring(9, 13); nextTransArrivalTime = nextTransArrivalTime.substring(0, 2) + "h" + nextTransArrivalTime.substring(2);

        etapesTransport.push({nextTrans, nextTransTime, nextTransArrivalName, nextTransArrivalTime});
      }
    }

    return etapesTransport;
  },

  //Permet de convertir un horaire format timestamp donné par le calendrier Google en un format yyyymmddThhmmss
  convertTimestamp: function(timestamp) {
    const tzOffset = new Date().getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(timestamp - tzOffset)).toISOString().slice(0, -5);
    const formattedForNavitia = localISOTime.replace(/:/gi,"").replace(/-/gi,"")
    return formattedForNavitia;
  },

  //Met à jour this.event.arrival (coordonnées du lieu du prochain événement) en fonction de l'adresse donnée
  updateGpsCoordinates(address){
    const self = this;
    let url = "https://maps.googleapis.com/maps/api/geocode/json?address=" + address + "&key=" + this.config.googleMapKey;
    url = encodeURI(url);

    request.get(url, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        return console.log("Error with Google Maps API request : " + error || { statusCode: response.statusCode });
      }
      else {
        const doc = JSON.parse(body);
        const location = doc.results[0].geometry.location;

        const res = location.lng + "%3B" + location.lat;
        self.sendSocketNotification("EVENT_INFO_FORMATTED", res);
      }
    });
  },

  //Traiter ici les notifications provenant du module
  //Rappel : une notification est composée d'un nom (NOM_NOTIFICATION) et d'un payload (contenuNotification)
  //le mot clé "socket" indique que la notification est INTERNE au module 
  socketNotificationReceived: function(notification, payload) {
    switch (notification) {
      case "GET_CONFIG":
        // On charge la config (coordonnées miroir, key) on start of module
        this.config = payload;
        break;
      case "UPDATE_EVENT_INFO":        
        // On charge la config
        /*ENSC
        https://nominatim.openstreetmap.org/search?q=ensc+talence&format=json --> resultat[0]["lat"]   resultat[0]["lon"]
        this.config.nextEventLat = 44.806287;
        this.config.nextEventLon = -0.596923;
        */
        /*Patinoire Mériadeck (changement d'arrêt)
        this.config.nextEventLat = 44.83487;
        this.config.nextEventLon = -0.58779;
        */
        //this.config.eventAddress = "109 Avenue Roul, Talence"; //payload["nextEventAddress"];
        //this.config.arrivalTime = "20180427T100000"; //payload["nextEventTime"];

        const nextEvent = payload;
        this.config.arrivalTime = this.convertTimestamp(nextEvent.startDate);
        this.updateGpsCoordinates(nextEvent.location);
        break;
      case "FETCH_NAVITIA":
        this.config.eventAddressGPS = payload;
        //On exécute la requete vers navitia
        this.navitiaRequest();
        break;
  }
}
});
