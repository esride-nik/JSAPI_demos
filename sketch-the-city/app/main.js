var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "esri/WebScene", "esri/views/SceneView", "esri/request"], function (require, exports, WebScene_1, SceneView_1, request_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    WebScene_1 = __importDefault(WebScene_1);
    SceneView_1 = __importDefault(SceneView_1);
    request_1 = __importDefault(request_1);
    function App() {
        var speedFactor = 0.02;
        var offset = 3000;
        var mode = "light";
        var webscene;
        var view;
        var intro = document.getElementById("intro");
        var loading = document.getElementById("loading");
        var error = document.getElementById("error");
        var id;
        var city;
        var pathNo;
        var mode;
        var aniMax;
        var aniSlideCounter;
        // function to retrieve query parameters (in this case only id)
        function getUrlParams() {
            var queryParams = document.location.search.substr(1);
            var result = {};
            queryParams.split("?").map(function (params) {
                params.split("&").map(function (param) {
                    var item = param.split("=");
                    result[item[0]] = decodeURIComponent(item[1]);
                });
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
        }
        else if (city) {
            // load the cities from the json file
            request_1.default('./cities.json', {
                responseType: "json"
            })
                .then(function (response) {
                var cityCfg = response.data.cities.filter(function (cityCfg) {
                    if (cityCfg.short === city) {
                        return true;
                    }
                    ;
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
        }
        else {
            document.getElementById("customCSS").href = "./styles/light.css";
        }
        if (webscene) {
            webscene.layers.forEach(function (layer) {
                setSketchRenderer(layer);
            });
        }
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
            console.log("createPresentation", slides.items);
            // TODO: choose from several configured paths and animation styles here (DepthOfField, revolve)
            playAnimation(slides.items);
        }
        function playAnimation(slides) {
            console.log("Playing flight", slides, view);
            view.on("click", function (e) {
                console.log("click", e);
                aniMax = slides.length;
                aniSlideCounter = 0;
                aniNextLocation(slides);
            });
        }
        function aniNextLocation(slides) {
            console.log("Approaching location #" + (aniSlideCounter + 1), slides[aniSlideCounter], slides[aniSlideCounter].viewpoint);
            new Promise(function (resolve) {
                setTimeout(resolve, offset);
            }).then(function () {
                console.log("Offset over", offset);
                if (aniSlideCounter <= slides.length) {
                    view.goTo(slides[aniSlideCounter].viewpoint, {
                        animate: true,
                        speedFactor: speedFactor,
                        maxDuration: 1000000,
                        easing: "in-out-coast-quadrati"
                    }).then(function () {
                        aniNextLocation(slides);
                    });
                    aniSlideCounter++;
                }
            });
        }
        function setScene(id) {
            console.log("Setting scene for ", id);
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
            view = new SceneView_1.default({
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
            });
            // .catch(function () {
            //     loading.classList.add("hide");
            //     error.classList.remove("hide");
            // });
            window.view = view;
        }
    }
    ;
    App();
});
//# sourceMappingURL=main.js.map