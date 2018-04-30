//Node_helper for : MMM-Bordeaux-Transport

//Modules nodejs requis par le node helper
var NodeHelper = require("node_helper");
var request = require("request");

module.exports = NodeHelper.create({
  // À exécuter lors du démarrage du miroir
  start: function() {
    console.log("MMM-Bordeaux-Transports helper started ...");
  },


  fetchNavitia: function(url, moment="NOW") {
    let self = this;
    let options = {
      url: url,
      auth: { username: this.config.navitiaKey, password: this.config.mdp }
    };
    request.get(options, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        self.sendSocketNotification("NAVITIA_RESULT_" + moment, null);
        return console.log(error || { statusCode: response.statusCode });

      } else {
        //Traiter notre réponse "body", qui est le contenu de "response", on récupère ce dont on a besoin
        journey = JSON.parse(body);

        //Effectue les requêtes pour les "journeys" précédents et suivants, s'ils existent
        if (moment === "NOW"){
          if (journey["links"][0]["type"] == "next") {
            nextURL = journey["links"][0]["href"];
            self.fetchNavitia(nextURL, "NEXT");
          }

          if (journey["links"][1]["type"] == "prev") {
            prevURL = journey["links"][1]["href"];
            self.fetchNavitia(nextURL, "PREV");
          }          
        }

        self.sendSocketNotification("NAVITIA_RESULT_" + moment, self.getSteps(journey));
      }
    });
  },

  getJourneys : function(){
    let from = this.config.homeLongitude + "%3B" + this.config.homeLatitude;
    let to = this.config.eventAddressGPS;

    let nowUrl = "https://api.navitia.io/v1/coverage/fr-sw/journeys?from=" + from + "&to=" + to + "&datetime_represents=arrival&datetime=" + this.config.arrivalTime + "&";
    this.fetchNavitia(nowUrl);
  },

  getSteps: function(journey) {
    let path;
    //on sélectionne le plus rapide par défaut, à modifier selon besoin
    for (num in journey["journeys"]) {
      if (journey["journeys"][num]["type"] == "rapid") {
        path = journey["journeys"][num];
      }
    }
    if (typeof path == "undefined") {
      //si on n'a pas trouvé de "rapid", on récup le premier journey proposé
      path = journey["journeys"][0];
    }

    let steps = [];

    if (path["sections"].length == 1) {
      //si un une seule étape dans le journey, donc très probablement de la marche proposée
      let section = path["sections"][num];
      const step = {
        mode: "walking",
        nextTransTime: section["departure_date_time"].substring(9, 11) + "h" + section["departure_date_time"].substring(11,13),
        arrival: section["to"]["stop_point"]["name"],
        arrivalTime: Math.floor(path["sections"][0]["duration"] / 60),
      };

      steps.push(step);
      return steps;
    }

    //sinon ...
    for (num in path["sections"]) {
      let section = path["sections"][num];
      let step;
      if (section["type"] == "public_transport") {
        step = {
          mode: section["display_informations"]["physical_mode"],
          line: section["display_informations"]["name"],
          departure: section["from"]["stop_point"]["name"],
          terminus: section["display_informations"]["headsign"],
          nextTransTime: section["departure_date_time"].substring(9, 11) + "h" + section["departure_date_time"].substring(11,13),
          arrival: section["to"]["stop_point"]["name"],
          arrivalTime: section["arrival_date_time"].substring(9, 11) + "h" + section["arrival_date_time"].substring(11,13),
        };

      }else{
        step = {
          mode: "walking" ,
          //... A COMPLETER ICI
        };

      }

      steps.push(step);
      
    }

    return steps;
  },

  //Permet de convertir un horaire format timestamp donné par le calendrier Google en un format yyyymmddThhmmss
  convertTimestamp: function(timestamp) {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const localISOTime = new Date(timestamp - tzOffset)
      .toISOString()
      .slice(0, -5);
    const formattedForNavitia = localISOTime
      .replace(/:/gi, "")
      .replace(/-/gi, "");
    return formattedForNavitia;
  },

  //Met à jour this.event.arrival (coordonnées du lieu du prochain événement) en fonction de l'adresse donnée
  updateGpsCoordinates(address) {
    const self = this;
    let url =
      "https://maps.googleapis.com/maps/api/geocode/json?address=" +
      address +
      "&key=" +
      this.config.googleMapKey;
    url = encodeURI(url);

    request.get(url, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        return console.log(
          "Error with Google Maps API request : " + error || {
            statusCode: response.statusCode
          }
        );
      } else {
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
      case "CONFIG":
        // On charge la config (coordonnées miroir, key) on start of module
        this.config = payload;
        break;
      case "UPDATE_EVENT_INFO":
        const nextEvent = payload;
        this.config.arrivalTime = this.convertTimestamp(nextEvent.startDate);
        this.updateGpsCoordinates(nextEvent.location);
        break;
      case "FETCH_NAVITIA":
        this.config.eventAddressGPS = payload;
        //On exécute la requete vers navitia
        this.getJourneys();
        break;
    }
  }
});
