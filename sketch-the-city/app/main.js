var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "esri/WebScene", "esri/views/SceneView"], function (require, exports, WebScene_1, SceneView_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    WebScene_1 = __importDefault(WebScene_1);
    SceneView_1 = __importDefault(SceneView_1);
    function App() {
        var mode = "light";
        var webscene;
        var intro = document.getElementById("intro");
        var loading = document.getElementById("loading");
        var error = document.getElementById("error");
        // function to retrieve query parameters (in this case only id)
        function getIdParam() {
            var queryParams = document.location.search.substr(1);
            var result = {};
            queryParams.split("&").forEach(function (part) {
                var item = part.split("=");
                result[item[0]] = decodeURIComponent(item[1]);
            });
            return result.id;
        }
        var id = getIdParam();
        // function to set an id once a scene was selected
        function setId(id) {
            window.history.pushState("", "", window.location.pathname + "?id=" + id);
        }
        // if user loaded scene by setting an id in the url, load that scene
        if (id) {
            setScene(id);
            // else display the intro text
        }
        else {
            intro.classList.remove("hide");
        }
        // load the cities from the json file
        esriRequest('./cities.json', {
            responseType: "json"
        })
            // when loaded successfully use the data to create the menu of cities at the top
            .then(function (response) {
            var cities = response.data.cities;
            var cityContainer = document.getElementById("cities");
            var _loop_1 = function (i) {
                var city = cities[i];
                var button = document.createElement("button");
                button.innerHTML = city.title;
                button.addEventListener("click", function () {
                    setScene(city.id);
                    setId(city.id);
                    if (city.attribution) {
                        document.getElementById("attribution").innerHTML = city.attribution + '. Made with <a href="" target="_blank">ArcGIS API for JavaScript</a>';
                    }
                }.bind(city));
                cityContainer.appendChild(button);
            };
            // generate the menu using plain old vanilla JS DOM API
            for (var i = 0; i < cities.length; i++) {
                _loop_1(i);
            }
        })
            // if something went wrong with the loading show an error in the console
            .catch(function (err) {
            console.log(err);
        });
        function setSketchRenderer(layer) {
            var outlineColor = mode === "dark" ? [255, 255, 255, 0.8] : [0, 0, 0, 0.8];
            var fillColor = mode === "dark" ? [10, 10, 10, 0.1] : [255, 255, 255, 0.1];
            var size = mode === "dark" ? 2 : 1;
            var sketchEdges = {
                type: "sketch",
                color: outlineColor,
                size: size,
                extensionLength: 2
            };
            // this renderers all the layers with semi-transparent white faces
            // and displays the geometry with sketch edges
            var renderer = {
                type: "simple",
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
            var slideContainer = document.getElementById("slides");
            if (slides.length) {
                // create list using plain old vanilla JS
                var slideList_1 = document.createElement("ul");
                slideContainer.appendChild(slideList_1);
                slides.forEach(function (slide) {
                    var slideElement = document.createElement("li");
                    slideElement.id = slide.id;
                    slideElement.classList.add("slide");
                    var title = document.createElement("div");
                    title.innerHTML = slide.title.text;
                    slideElement.appendChild(title);
                    slideElement.addEventListener("click", function () {
                        // the slide is only used to zoom to a viewpoint (more like a bookmark)
                        // because we don't want to modify the view in any other way
                        // this also means that layers won't change their visibility with the slide, so make all layers visible from the beginning
                        view.goTo(slide.viewpoint);
                    }.bind(slide));
                    slideList_1.appendChild(slideElement);
                });
            }
        }
        function setScene(id) {
            document.getElementById("slides").innerHTML = "";
            document.getElementById("attribution").innerHTML = 'Made with <a href="" target="_blank">ArcGIS API for JavaScript</a>.';
            if (!intro.classList.contains("hide")) {
                intro.classList.add("hide");
            }
            if (!error.classList.contains("hide")) {
                error.classList.add("hide");
            }
            loading.classList.remove("hide");
            // create an empty webscene
            webscene = new WebScene_1.default({
                ground: {
                    opacity: 0
                },
                basemap: null
            });
            // create a view with a transparent background
            var view = new SceneView_1.default({
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
            var origWebscene = new WebScene_1.default({
                portalItem: {
                    id: id
                }
            });
            // once all resources are loaded...
            origWebscene.loadAll().then(function () {
                // select the 3D object scene layers only
                var sceneLayers = origWebscene.allLayers.filter(function (layer) {
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
        // when changing the visualization mode swap the css files and change renderer
        document.getElementById("mode").addEventListener("click", function (evt) {
            if (mode === "light") {
                mode = "dark";
                evt.target.innerHTML = "Pencil";
                document.getElementById("customCSS").href = "./styles/dark.css";
            }
            else {
                mode = "light";
                evt.target.innerHTML = "Chalk";
                document.getElementById("customCSS").href = "./styles/light.css";
            }
            if (webscene) {
                webscene.layers.forEach(function (layer) {
                    setSketchRenderer(layer);
                });
            }
        });
    }
    ;
    App();
});
//# sourceMappingURL=main.js.map