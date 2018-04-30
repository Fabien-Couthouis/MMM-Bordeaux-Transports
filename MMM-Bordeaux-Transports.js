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
    this.journey = [new Object, new Object, new Object];

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

  //Retourne le prochain événement de la liste, avec une marge de 15 minutes  (s'il a commencé depuis 10min, on le retourne quand meme)
  getNextEvent(eventsList){
    const now = Date.now();
    const margin = 15 * 60 * 1000;

    for(let e = 0; e<eventsList.length; e++){
      if (eventsList[e].startDate + margin > now ){
        return eventsList[e]
      }
    }
    return null;
  },

  // Override le générateur du Dom, à changer pour l'affichage
  getDom: function() {
    const wrapper = document.createElement("div");

    if (typeof this.nextEventLocation === "undefined" || typeof this.journey[1].sections === "undefined") {
      wrapper.innerHTML += "Calcul du prochain itinéraire...";

    }else { 
      const title = document.createElement("span");
      title.textContent = "Itinéraire vers " + this.nextEventLocation;
      wrapper.appendChild(title);
      const br = document.createElement("br");
      const journeys = document.createElement("div");

      const hr = document.createElement("hr");
      wrapper.appendChild(hr);

      const table = document.createElement("table");

      const arrow = document.createElement("img");
      arrow.src = "./modules/MMM-Bordeaux-Transports/icons/arrow.png";
      arrow.classList = "journeyIcon";

      for(let j=0; j < this.journey.length; j++){
        const iconsLine = document.createElement("tr");
        const info1Line = document.createElement("tr");
        const info2Line = document.createElement("tr");

        for(let s=0; s < this.journey[j].sections.length; s++ ){
          const section = this.journey[j].sections[s];

          const icon = document.createElement("td");
          icon.innerHTML = '<img class="journeyIcon" src="./modules/MMM-Bordeaux-Transports/icons/' + section.icon + '.png"></img>';;
          iconsLine.appendChild(icon);

          const info1 = document.createElement("td")
          info1.textContent = section.info1;
          info1.classList = "info2";
          info1Line.appendChild(info1);

          const info2 = document.createElement("td")
          info2.textContent = section.info2;
          info2.classList = "info2";
          info2Line.appendChild(info2);


          

          if (s !== this.journey[j].sections.length - 1){
            emptyTd = document.createElement("td");
            iconsLine.appendChild(arrow.cloneNode());
            info1Line.appendChild(emptyTd.cloneNode());
            info2Line.appendChild(emptyTd.cloneNode());
          }
        }

      

      table.appendChild(iconsLine);
      table.appendChild(info1Line);
      table.appendChild(info2Line);
      }
      journeys.appendChild(table);
      wrapper.appendChild(journeys);
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
        this.journey[0].sections = payload;
        break;
      case "NAVITIA_RESULT_NOW" :
        this.journey[1].sections = payload;
        break;
      case "NAVITIA_RESULT_NEXT" :
        this.journey[2].sections = payload;
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
