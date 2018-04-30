/* Timetable for Bordeaux, France local transport Module */

/* Magic Mirror
 * Module: MMM-Bordeaux-Transport
 * By Raphaël Brès && Fabien Couthouis, ENSC
 */

Module.register("MMM-Bordeaux-Transports", {
  // Definition des paramètres de configuration par défaut, accessibles via this.config.nomVariable
  defaults: {
    updateInterval: 1 * 3 * 1000, //temps de rafraichissement en ms, RELOAD CHAQUE SECONDE POUR L'INSTANT
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
    this.journeys = [];

    this.sendConfig();

    //Rafraichissement de l'affichage et des informations
    setInterval(function() {
      self.updateDom();
    }, self.config.updateInterval);
  },

  //Envoie la configuration au node helper
  sendConfig: function() {
      this.sendSocketNotification("CONFIG", this.config);
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
    //VOIR CONSOLE POUR VOIR LES INFOS
    console.log(this.journeys)

    if (typeof this.nextEventLocation === "undefined" || typeof this.journeys[0] === "undefined") {
      wrapper.innerHTML += "Calcul du prochain itinéraire...";

    }else { 
      const title = document.createElement("span");
      title.textContent = "Itinéraire vers " + this.nextEventLocation;
      wrapper.appendChild(title);
      const br = document.createElement("br");

      const hr = document.createElement("hr");
      wrapper.appendChild(hr);

      const table = document.createElement("table");
      

      const arrow = document.createElement("img");
      arrow.src = "./modules/MMM-Bordeaux-Transports/icons/arrow.png";
      arrow.classList = "journeyIcon";


      for(let j=0; j < this.journeys.length; j++){
        const iconsLine = document.createElement("tr");
        const info1Line = document.createElement("tr");
        const info2Line = document.createElement("tr");

        for(let s=0; s < this.journeys[j].length; s++ ){
          const section = this.journeys[j][s];
          const icon = document.createElement("td");
          icon.innerHTML = '<img class="journeyIcon" src="./modules/MMM-Bordeaux-Transports/icons/' + section.mode + '.png"></img>';;
          iconsLine.appendChild(icon);

          

          if (s !== this.journeys[j].length - 1)
            iconsLine.appendChild(arrow.cloneNode());
        }

      

      table.appendChild(iconsLine);
      table.appendChild(info1Line);
      table.appendChild(info2Line);
      }
      wrapper.appendChild(table);
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
      case "NAVITIA_RESULT_PREV" :
        this.journeys[0] = payload;
        break;
      case "NAVITIA_RESULT_NOW" :
        this.journeys[1] = payload;
        break;
      case "NAVITIA_RESULT_NEXT" :
        this.journeys[2] = payload;
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
          //Nom du lieu de l'événement stocké dans this.nextEventLocation. On ne prend que la première partie de l'adresse (nom du lieu)
          if (nextEvent.location.includes(',')){
            this.nextEventLocation = nextEvent.location.substr(0, nextEvent.location.indexOf(',')); 
          }else this.nextEventLocation = nextEvent.location;

          this.sendSocketNotification("UPDATE_EVENT_INFO", nextEvent);
        }
        else console.log("Error : cannot get next event. Try to verify if it exists in calendar.");        
        break;
    }
  }
});
