/* Timetable for Bordeaux, France local transport Module */

/* Magic Mirror
 * Module: MMM-Bordeaux-Transport
 * By Raphaël Brès && Fabien Couthouis, ENSC
 */

Module.register("MMM-Bordeaux-Transports", {
  // Definition des paramètres de configuration par défaut, accessibles via this.config.nomVariable
  defaults: {
    updateInterval: 1 * 1 * 1000, //temps de rafraichissement en ms, RELOAD CHAQUE SECONDE POUR L'INSTANT
    homeLatitude: 44.815051, //https://www.coordonnees-gps.fr
    homeLongitude: -0.588111,
    navitiaKey: "3cb5aaa3-2743-42f8-929c-b5f36ff64cb9",
    mdp: "fabien47",
    googleMapKey: "AIzaSyC1y4lpgvpsbjTxBczKKMjUamquldQR8AY",
  },

  // Récupère les feuilles de style (fontawesome pour les icones, à virer si inutile)
  getStyles: function() {
    return ["MMM-Bordeaux-Transports.css", "font-awesome.css"];
  },

  // Comportement au démarrage
  start: function() {
    Log.info("Starting module: " + this.name);   


    const self = this;
    this.sendConfig();

    //Rafraichissement de l'affichage et des informations
    setInterval(function() {
      self.updateDom();
    }, self.config.updateInterval);
  },

  //Envoie la configuration au node helper
  sendConfig: function() {
      this.sendSocketNotification("GET_CONFIG", this.config);
  },

  getNextEvent(eventsList){
    const now = Date.now();

    for(let e = 0; e<eventsList.length; e++){
      if (eventsList[e].startDate > now){
        return eventsList[e]
      }
    }
    return null;
  },

  // Override le générateur du Dom, à changer pour l'affichage
  getDom: function() {
    const wrapper = document.createElement("div");
    const br = document.createElement("br");
    
    if (typeof this.config.navitia == "undefined") {wrapper.innerHTML += "Calcul du prochain itinéraire...";}
    else {      
      let navitiaRes = this.config.navitia;
      for (time in navitiaRes) { //on se balade entre now, pre et nex Res;   
        //on indique de quel moment par rapport à l'event il s'agit
        if (time == 0) {wrapper.innerHTML += "RECOMMANDÉ"; wrapper.appendChild(br);} else if (time == 1) {wrapper.innerHTML += "PLUS TÔT"; wrapper.appendChild(br);} else if (time == 2) {wrapper.innerHTML += "PLUS TARD"; wrapper.appendChild(br);} 
        for (etape in navitiaRes[time]) { //on se balade entre chaque étape du journey
          wrapper.innerHTML += navitiaRes[time][etape]["nextTrans"] + " à " + navitiaRes[time][etape]["nextTransTime"];
          wrapper.appendChild(br);
          if (navitiaRes[time].length != 1) {
            let txtArret = "Arrêt " + navitiaRes[time][etape]["nextTransArrivalName"];
            if ((etape == navitiaRes[time].length-1)) {txtArret += " à " + navitiaRes[time][etape]["nextTransArrivalTime"];} //on n'affiche l'heure de descente que si c'est le dernier arrêt
            wrapper.innerHTML += txtArret;
          }
          wrapper.appendChild(br);
        }
      }
    }

    return wrapper;
  },

  //Notifications
  //Rappel : une notification est composée d'un nom (NOM_NOTIFICATION) et d'un payload (contenuNotification)

  // Gère les notifications INTERNES au module (interactions avec le node_helper)
  socketNotificationReceived: function(notification, payload) {
    switch (notification) {
      case "EVENT_INFO_FORMATTED" :
        const coordinates = payload;
        this.sendSocketNotification("FETCH_NAVITIA", coordinates);
        break;
      case "NAVITIA_RESULT" :
        this.config.navitia = payload;
        break;
    }
  },

  //Gère les notifications inter-modules
  notificationReceived: function(notification, payload) {
    switch (notification) {
      case "CALENDAR_EVENTS":
        const eventsList = payload;
        //Récupération de la prochaine activité
        const nextEvent = this.getNextEvent(eventsList);
        if (nextEvent !== null){
          this.sendSocketNotification("UPDATE_EVENT_INFO", nextEvent);
        }
        else console.log("Error : cannot get next event. Try to verify if it exists in calendar.");        
        break;
    }
  }
});
