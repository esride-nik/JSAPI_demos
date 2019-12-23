import WebScene from  "esri/WebScene";
import SceneView from  "esri/views/SceneView";
import esriRequest from  "esri/request";

function App() {

  let mode = "light";
  let webscene: SceneView;

  const intro = document.getElementById("intro");
  const loading = document.getElementById("loading");
  const error = document.getElementById("error");

  let id: string;
  let city: string;
  let pathNo: string;
  let mode: string;

  // function to retrieve query parameters (in this case only id)
  function getUrlParams() {
    const queryParams = document.location.search.substr(1);
    let result: any = {};

    queryParams.split("?").map((params: string) => {
        params.split("&").map((param: string) => {
            var item = param.split("=");
            result[item[0]] = decodeURIComponent(item[1]);
        })
    });

    id = result.id;
    city = result.city;
    pathNo = result.pathNo;
    mode = result.mode;
  }

 getUrlParams();

  // if user loaded scene by setting an id in the url, load that scene
  if (id) {
    setScene(id);
  // else display the intro text
  } else if (city) {
    // load the cities from the json file
    esriRequest('./cities.json', {
        responseType: "json"
    })
    .then((response: any) => {
        let cityCfg = response.data.cities.filter((cityCfg: any) => {
            if (cityCfg.short === city) {
                return true;
            };
        });
        if (cityCfg) {
            console.log("City shortcode found.", cityCfg[0]);
            id = cityCfg[0].id;
            setScene(id);
        }
        else {
            console.error("City shortcode not found.");
            
        }
    });
  }
  else {
      console.error("Please provide city or id URL parameter.");
  }

  
//  visualization mode
if (mode === "dark") {
    document.getElementById("customCSS").href = "./styles/dark.css";
} else {
    document.getElementById("customCSS").href = "./styles/light.css";
}
if (webscene) {
    webscene.layers.forEach(function(layer) {
    setSketchRenderer(layer);
    });
}



  function setSketchRenderer(layer) {

    const outlineColor = mode === "dark" ? [255, 255, 255, 0.8] : [0, 0, 0, 0.8];
    const fillColor = mode === "dark" ? [10, 10, 10, 0.1] : [255, 255, 255, 0.1];
    const size = mode === "dark" ? 2 : 1;

    const sketchEdges = {
      type: "sketch",
      color: outlineColor,
      size: size,
      extensionLength: 2
    };

    // this renderers all the layers with semi-transparent white faces
    // and displays the geometry with sketch edges
    const renderer = {
      type: "simple", // autocasts as new SimpleRenderer()
      symbol: {
        type: "mesh-3d",
        symbolLayers: [{
          type: "fill",
          material: {
            color: fillColor,
            colorMixMode: "replace"
          },
          edges: sketchEdges
        }]
      }
    };
    layer.renderer = renderer;

  }

  // when the webscene has slides, they are added in a list at the bottom
  function createPresentation(slides) {

    const slideContainer = document.getElementById("slides");

    if (slides.length) {

      // create list using plain old vanilla JS
      const slideList = document.createElement("ul");
      slideContainer.appendChild(slideList);
      slides.forEach(function(slide) {

        let slideElement = document.createElement("li");
        slideElement.id = slide.id;
        slideElement.classList.add("slide");
        let title = document.createElement("div");
        title.innerHTML = slide.title.text;
        slideElement.appendChild(title);

        slideElement.addEventListener("click", function() {
          // the slide is only used to zoom to a viewpoint (more like a bookmark)
          // because we don't want to modify the view in any other way
          // this also means that layers won't change their visibility with the slide, so make all layers visible from the beginning
          view.goTo(slide.viewpoint);
        }.bind(slide));

        slideList.appendChild(slideElement);
      });
    }

  }

  function setScene(id) {
    console.log("Setting scene for ", id);

    document.getElementById("slides").innerHTML = "";

    if (!intro.classList.contains("hide")) {
      intro.classList.add("hide");
    }
    if (!error.classList.contains("hide")) {
      error.classList.add("hide");
    }
    loading.classList.remove("hide");

    // create an empty webscene
    webscene = new WebScene({
      ground: {
        opacity: 0
      },
      basemap: null
    });

    // create a view with a transparent background
    const view = new SceneView({
      container: "viewDiv",
      map: webscene,
      alphaCompositingEnabled: true,
      environment: {
        background: {
          type: "color",
          color: [0, 0, 0, 0]
        },
        starsEnabled: false,
        atmosphereEnabled: false
      },
      ui: {
        components: ["attribution"]
      }
    });

    // load the webscene with the city
    const origWebscene = new WebScene({
      portalItem: {
        id: id
      }
    });

    // once all resources are loaded...
    origWebscene.loadAll().then(function () {

      // select the 3D object scene layers only
      const sceneLayers = origWebscene.allLayers.filter(function (layer) {
        return (layer.type === "scene" && layer.geometryType === "mesh");
      });

      // apply the sketch renderer and disable popup
      sceneLayers.forEach(function (layer) {
          setSketchRenderer(layer);
          layer.popupEnabled = false;
      });

      // add these layers to the empty webscene
      webscene.addMany(sceneLayers);

      // go to initial viewpoint in the scene
      view.goTo(origWebscene.initialViewProperties.viewpoint)
        .then(function () {
          loading.classList.add("hide");
        })
        .catch(function (err) {
          console.log(err);
        });

      // generate the presentation
      webscene.presentation = origWebscene.presentation.clone();
      createPresentation(webscene.presentation.slides);
    })
    .catch(function () {
      loading.classList.add("hide");
      error.classList.remove("hide");
    });

    window.view = view;
  }
};

App();
