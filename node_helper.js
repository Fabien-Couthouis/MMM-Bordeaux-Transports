//Node_helper for : MMM-Bordeaux-Transport

//Modules nodejs requis par le node helper
var NodeHelper = require("node_helper");
var request = require('request');

module.exports = NodeHelper.create({

  // À exécuter lors du démarrage du miroir
  start: function() {
    console.log("MMM-Bordeaux-Transports helper started ...");
    
    // Info relatives au prochain événement)
    this.event = {
      beginTime: "",
      arrival: ""
    };    
  },

  //Met à jour this.event.arrival (coordonnées du lieu du prochain événement) en fonction de l'adresse donnée
  updateGpsCoordinates(adress){
    const self = this;
    let url = "https://maps.googleapis.com/maps/api/geocode/json?address=" + adress + "&key=" + this.config.googleMapKey;
    url = encodeURI(url);

    request.get(url, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        return console.log("Error with Google Maps API request : " + error || { statusCode: response.statusCode });
      }
      else {
        const doc = JSON.parse(body);
        const location = doc.results[0].geometry.location;

        self.event.arrival = {
          lng: location.lng,
          lat: location.lat
        };

        self.sendSocketNotification("EVENT_INFO_FORMATTED", this.arrival);
      }
    });
  },


  //Requête vers Navitia
  navitiaRequest: function() {
    const self = this;

    if (typeof this.event.arrival === "undefined"){
      return console.log("Error : Unknown variable : this.event.lat. Update gps coordinate before using this function.");
    }

    let from = this.config.homeLongitude + "%3B" + this.config.homeLatitude;
    let to = this.event.arrival.lng + "%3B" + this.event.arrival.lat;
    let url = "https://api.navitia.io/v1/coverage/fr-sw/journeys?from=" + from + "&to=" + to + "&datetime=" + this.event.beginTime + "&";

    let options = {
      url: url,
      auth: {
        username: this.config.navitiaKey,
        password: this.config.navitiaPswd
      }
    };

    request.get(options, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        return console.log("Error with Navitia request : " + error || { statusCode: response.statusCode });
      }
      else {
        //Traiter notre réponse 
        //...
        //On peut ensuite envoyer une notification au module (payload = contenu de la notification)
        self.sendSocketNotification("NAVITIA_RESULT", body);
      }
    });

  },

  //Permet de convertir un horaire format timestamp donné par le calendrier Google en un format hh:mm:ss
  convertTimestamp: function(timestamp) {
    const tzOffset = new Date().getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(timestamp - tzOffset)).toISOString().slice(0, -5);
    const formattedForNavitia = localISOTime.replace(/:/gi,"").replace(/-/gi,"")
    return formattedForNavitia;
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

        //Met les informations de l'événement au bon format et les stock dans la variable this.event
      case "FORMAT_EVENT_INFO":     
        const event1 = payload;
        this.event.beginTime = this.convertTimestamp(event1.startDate);
        this.updateGpsCoordinates(event1.location);
        break;

      case "FETCH_NAVITIA":
        //On exécute la requete vers navitia
        this.navitiaRequest();
        break;

  }
}
});
