# coding=utf-8
"""

  This is an XBlock which creates a bridge between EdX and Harvard's Worldmap mapping client.
  It sets up a client-slave relationship with the worldmap client which is loaded in an iframe and can get
  that client to do our bidding via a message passing interface.

  Written by Robert Light   light@alum.mit.edu

"""
from hashlib import md5
import pkg_resources
import logging
import math
import shapely
import sys
import json
import time

from string import Template
from xblock.core import XBlock
from xblock.fields import Reference, ReferenceList, Field, Scope, Integer, Any, String, Float, Dict, Boolean,List, \
    UserScope, BlockScope
from xblock.fragment import Fragment
from lxml import etree
from shapely.geometry.polygon import Polygon
from shapely.geometry import LineString
from shapely.geometry.point import Point
from shapely.geos import TopologicalError
from shapely import ops, affinity
from random import randrange
from django.utils.translation import ugettext as _    #see - https://docs.djangoproject.com/en/1.3/topics/i18n/internationalization/
from xmodule.modulestore import Location
from .utils import load_resource, render_template

log = logging.getLogger(__name__)


#*************************** UTILITY FUNCTIONS ************************************************
def makePoint(pt):
    return Point(pt['lon']+360., pt['lat'])      #pad longitude by 360 degrees to avoid int'l date line problems

def makePolygon(list):
    arr = []
    for pt in list:
        arr.append((pt['lon']+360., pt['lat']))   #pad longitude by 360 degrees to avoid int'l date line problems
    return Polygon(arr)

def makeLineString(list):
    arr = []
    for pt in list:
        arr.append((pt['lon']+360., pt['lat']))   #pad longitude by 360 degrees to avoid int'l date line problems
    return LineString(arr)

def parse_contents(node):
    content = unicode(node.text or u"")
    for child in node:
        content += etree.tostring(child, encoding='unicode')
    return content

#***********************************************************************************************

def fixupLayerTree(node):
    node['expand'] = False
    node['activate'] = False
    if 'children' in node:
        for n in node['children']:
            fixupLayerTree(n)
    return node


class WorldMapXBlock(XBlock):
    """
    A testing block that checks the behavior of the container.
    """
 #   threadLock = threading.Lock()

    # Fields are defined on the class.  You can access them in your code as
    # self.<fieldname>.

    # worldmapId = Integer(
    #     default=0, scope=Scope.user_state,
    #     help="The id of this worldmap on the page - needs to be unique page-wide",
    # )

    # see:  https://xblock.readthedocs.org/en/latest/guide/xblock.html#guide-fields

    configJson = """
                {
                    "highlights": [
                        {
                            "geometry": {
                                "points": [
                                    {
                                        "lat": 42.35148683512319,
                                        "lon": -71.09350774082822
                                    },
                                    {
                                        "lat": 42.34706235935522,
                                        "lon": -71.09275672230382
                                    },
                                    {
                                        "lat": 42.3471733715164,
                                        "lon": -71.08775708470029
                                    },
                                    {
                                        "lat": 42.34328782922443,
                                        "lon": -71.08567569050435
                                    },
                                    {
                                        "lat": 42.34140047917672,
                                        "lon": -71.08329388889936
                                    },
                                    {
                                        "lat": 42.347379536438645,
                                        "lon": -71.07614848408352
                                    },
                                    {
                                        "lat": 42.3480456031057,
                                        "lon": -71.07640597614892
                                    },
                                    {
                                        "lat": 42.34785529906382,
                                        "lon": -71.0728225449051
                                    },
                                    {
                                        "lat": 42.34863237027516,
                                        "lon": -71.07200715336435
                                    },
                                    {
                                        "lat": 42.34942529018035,
                                        "lon": -71.07228610310248
                                    },
                                    {
                                        "lat": 42.35004376076278,
                                        "lon": -71.07011887821837
                                    },
                                    {
                                        "lat": 42.351835705270716,
                                        "lon": -71.0708055237264
                                    },
                                    {
                                        "lat": 42.35616470553563,
                                        "lon": -71.07325169834775
                                    },
                                    {
                                        "lat": 42.35600613935877,
                                        "lon": -71.07408854756031
                                    },
                                    {
                                        "lat": 42.357131950552244,
                                        "lon": -71.07483956608469
                                    },
                                    {
                                        "lat": 42.35166127043902,
                                        "lon": -71.09331462177917
                                    }
                                ],
                                "type": "polygon"
                            },
                            "id": "backbay"
                        }
                    ],
                    "explanation": "General HTML prose goes here.  Delete it if not needed. Include an anchor like <a href='#' onclick='return highlight(\\"backbay\\",5000,0)'>Back Bay</a> to highlight areas on the map",
                    "questions": [
                        {
                            "hintAfterAttempt": 2,
                            "color": "00FF00",
                            "explanation": "Where is the biggest island in Boston harbor?",
                            "hintDisplayTime": -1,
                            "type": "point",
                            "id": "foobar",
                            "constraints": [
                                {
                                    "explanation": "The island is somewhere near here",
                                    "padding": 1000,
                                    "maxAreaFactor": null,
                                    "percentMatch": null,
                                    "percentOfGrade": 100,
                                    "validated": true,
                                    "type": "inside",
                                    "geometry": {
                                        "type": "polygon",
                                        "points": [
                                            {
                                                "lat": 42.31071913366582,
                                                "lon": -70.9768638351889
                                            },
                                            {
                                                "lat": 42.31516203351538,
                                                "lon": -70.9710273483719
                                            },
                                            {
                                                "lat": 42.323919974596905,
                                                "lon": -70.96656415257098
                                            },
                                            {
                                                "lat": 42.32836194250175,
                                                "lon": -70.95935437473969
                                            },
                                            {
                                                "lat": 42.33090006905591,
                                                "lon": -70.95815274510085
                                            },
                                            {
                                                "lat": 42.33026554701893,
                                                "lon": -70.95368954929992
                                            },
                                            {
                                                "lat": 42.327727394860425,
                                                "lon": -70.95334622654636
                                            },
                                            {
                                                "lat": 42.3269659292422,
                                                "lon": -70.95712277683923
                                            },
                                            {
                                                "lat": 42.318969983762415,
                                                "lon": -70.96295926365534
                                            },
                                            {
                                                "lat": 42.31198856562581,
                                                "lon": -70.96553418430938
                                            },
                                            {
                                                "lat": 42.309322728939854,
                                                "lon": -70.97531888279559
                                            },
                                            {
                                                "lat": 42.31071913366582,
                                                "lon": -70.9768638351889
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    ]
                }
                """
    worldmapConfigJson = """
                {
                    "layers": [
                        {
                            "params": [
                                {
                                    "name": "CensusYear",
                                    "value": 1972
                                }
                            ],
                            "id": "OpenLayers_Layer_WMS_122"
                        },
                        {
                            "params": [
                                {
                                    "max": 1977,
                                    "name": "CensusYear",
                                    "min": 1973
                                }
                            ],
                            "id": "OpenLayers_Layer_WMS_124"
                        },
                        {
                            "params": [
                                {
                                    "name": "CensusYear",
                                    "value": 1976
                                }
                            ],
                            "id": "OpenLayers_Layer_WMS_120"
                        },
                        {
                            "params": [
                                {
                                    "name": "CensusYear",
                                    "value": 1978
                                }
                            ],
                            "id": "OpenLayers_Layer_WMS_118"
                        },
                        {
                            "params": [
                                {
                                    "name": "CensusYear",
                                    "value": 1980
                                }
                            ],
                            "id": "OpenLayers_Layer_Vector_132"
                        }
                    ],
                    "stickyMap": true,
                    "lat": 42.365,
                    "sliders": [
                        {
                            "help": "General <B>HTML</B> here - useful for creating a help message",
                            "min": 1970,
                            "max": 2010,
                            "title": "Example Slider",
                            "param": "CensusYear",
                            "increment": 1,
                            "position": "bottom",
                            "id": "slider-1412208064.961"
                        }
                    ],
                    "lon": -70.9,
                    "zoom": 9,
                    "height": 400,
                    "layer-controls": {
                        "activate": false,
                        "title": "Layers - hide if not needed",
                        "unselectable": false,
                        "noLink": false,
                        "isFolder": false,
                        "focus": false,
                        "tooltip": null,
                        "hideCheckbox": false,
                        "href": null,
                        "select": false,
                        "key": "_2",
                        "isLazy": false,
                        "hidden": false,
                        "addClass": null,
                        "children": [
                            {
                                "activate": false,
                                "title": "layerA",
                                "hideCheckbox": false,
                                "unselectable": false,
                                "noLink": false,
                                "isFolder": false,
                                "focus": false,
                                "tooltip": null,
                                "visible": true,
                                "href": null,
                                "select": false,
                                "key": "OpenLayers_Layer_WMS_120",
                                "isLazy": false,
                                "hidden": false,
                                "addClass": null,
                                "expand": false,
                                "icon": null
                            },
                            {
                                "activate": false,
                                "title": "layerB",
                                "hideCheckbox": false,
                                "unselectable": false,
                                "noLink": false,
                                "isFolder": false,
                                "focus": false,
                                "tooltip": null,
                                "visible": true,
                                "href": null,
                                "select": false,
                                "key": "OpenLayers_Layer_WMS_122",
                                "isLazy": false,
                                "hidden": false,
                                "addClass": null,
                                "expand": false,
                                "icon": null
                            },
                            {
                                "activate": false,
                                "title": "layerC",
                                "hideCheckbox": false,
                                "unselectable": false,
                                "noLink": false,
                                "isFolder": false,
                                "focus": false,
                                "tooltip": null,
                                "visible": true,
                                "href": null,
                                "select": false,
                                "key": "OpenLayers_Layer_WMS_124",
                                "isLazy": false,
                                "hidden": false,
                                "addClass": null,
                                "expand": false,
                                "icon": null
                            },
                            {
                                "activate": false,
                                "title": "layerD",
                                "hideCheckbox": false,
                                "unselectable": false,
                                "noLink": false,
                                "isFolder": false,
                                "focus": false,
                                "tooltip": null,
                                "visible": true,
                                "href": null,
                                "select": false,
                                "key": "OpenLayers_Layer_WMS_120",
                                "isLazy": false,
                                "hidden": false,
                                "addClass": null,
                                "expand": false,
                                "icon": null
                            },
                            {
                                "activate": false,
                                "title": "layerE",
                                "hideCheckbox": false,
                                "unselectable": false,
                                "noLink": false,
                                "isFolder": false,
                                "focus": false,
                                "tooltip": null,
                                "visible": true,
                                "href": null,
                                "select": false,
                                "key": "OpenLayers_Layer_WMS_118",
                                "isLazy": false,
                                "hidden": false,
                                "addClass": null,
                                "expand": false,
                                "icon": null
                            },
                            {
                                "activate": false,
                                "title": "layerF",
                                "hideCheckbox": false,
                                "unselectable": false,
                                "noLink": false,
                                "isFolder": false,
                                "focus": false,
                                "tooltip": null,
                                "visible": true,
                                "href": null,
                                "select": false,
                                "key": "OpenLayers_Layer_Vector_132",
                                "isLazy": false,
                                "hidden": false,
                                "addClass": null,
                                "expand": false,
                                "icon": null
                            },
                            {
                                "activate": false,
                                "title": "A sub group of layers",
                                "unselectable": false,
                                "noLink": false,
                                "isFolder": true,
                                "focus": false,
                                "tooltip": null,
                                "hideCheckbox": false,
                                "href": null,
                                "select": false,
                                "key": "_3",
                                "isLazy": false,
                                "hidden": false,
                                "addClass": null,
                                "children": [
                                    {
                                        "activate": false,
                                        "title": "A sub sub group of layers",
                                        "unselectable": false,
                                        "noLink": false,
                                        "isFolder": true,
                                        "focus": false,
                                        "tooltip": null,
                                        "hideCheckbox": false,
                                        "href": null,
                                        "select": false,
                                        "key": "_4",
                                        "isLazy": false,
                                        "hidden": false,
                                        "addClass": null,
                                        "children": [
                                            {
                                                "activate": false,
                                                "title": "layerE.1",
                                                "hideCheckbox": false,
                                                "unselectable": false,
                                                "noLink": false,
                                                "isFolder": false,
                                                "focus": false,
                                                "tooltip": null,
                                                "visible": true,
                                                "href": null,
                                                "select": false,
                                                "key": "OpenLayers_Layer_WMS_118",
                                                "isLazy": false,
                                                "hidden": false,
                                                "addClass": null,
                                                "expand": false,
                                                "icon": null
                                            },
                                            {
                                                "activate": false,
                                                "title": "layerF.1",
                                                "hideCheckbox": false,
                                                "unselectable": false,
                                                "noLink": false,
                                                "isFolder": false,
                                                "focus": false,
                                                "tooltip": null,
                                                "visible": true,
                                                "href": null,
                                                "select": false,
                                                "key": "OpenLayers_Layer_Vector_132",
                                                "isLazy": false,
                                                "hidden": false,
                                                "addClass": null,
                                                "expand": false,
                                                "icon": null
                                            }
                                        ],
                                        "expand": false,
                                        "icon": null
                                    }
                                ],
                                "expand": false,
                                "icon": null
                            }
                        ],
                        "expand": false,
                        "icon": null
                    },
                    "width": 500,
                    "stylesheet": "/* be careful, you can override edX styles here too */",
                    "href": "http://23.21.172.243/maps/bostoncensus/embed",
                    "debug": false,
                    "baseLayer": "OpenLayers_Layer_Google_116"
                }
    """

    display_name = String(help="appears in horizontal nav at top of page", default="WorldMap", scope=Scope.content)

    zoomLevel = Integer(help="zoom level of map", default=None, scope=Scope.user_state)
    centerLat = Float(help="center of map (latitude)", default=None, scope=Scope.user_state)
    centerLon = Float(help="center of map (longitude)", default=None, scope=Scope.user_state)

    layerState= Dict(help="dictionary of layer states, layer name is key", default={}, scope=Scope.user_state)

    config = Dict(help="config data", scope=Scope.content, default=json.loads(configJson))

    worldmapConfig = Dict(help="worldmap config data", scope=Scope.content, default=json.loads(worldmapConfigJson))

    scores = Dict(help="score data", scope=Scope.user_state, default={})

    has_children = False
    has_score = True

    @property
    def sliders(self):
        return self.worldmapConfig['sliders']

    # @property
    # def layers(self):
    #     return self.worldmapConfig.get('layers',None)

    def getUniqueId(self):
        return md5(unicode(str(self.scope_ids.usage_id) + str(time.time()))).hexdigest()

    def resource_string(self, path):
        """Handy helper for getting resources from our kit."""
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    @classmethod
    def parse_xml(cls, node, runtime, keys, id_generator):
        """
        Use `node` to construct a new block.

        Arguments:
            node (etree.Element): The xml node to parse into an xblock.

            runtime (:class:`.Runtime`): The runtime to use while parsing.

            keys (:class:`.ScopeIds`): The keys identifying where this block
                will store its data.

            id_generator (:class:`.IdGenerator`): An object that will allow the
                runtime to generate correct definition and usage ids for
                children of this block.

        """
        block = runtime.construct_xblock_from_class(cls, keys)

        explanationText = ''   #grovel out any explanation text out of <explanation> tag

        # The base implementation: child nodes become child blocks.
        for child in node:
            if( child.tag == "explanation" ):
                explanationText = parse_contents(child)  #found some explanation text
            elif( child.tag == "config" ):
                block.config = json.loads(parse_contents(child))
            elif( child.tag == "worldmap-config" ):
                block.worldmapConfig = json.loads(parse_contents(child))
            else:
                block.runtime.add_node_as_child(block, child, id_generator)

        # Attributes become fields.
        for name, value in node.items():
            if name in block.fields:
                setattr(block, name, value)

       # setattr(block,'explanationHTML',explanationText)

        # Text content becomes "content", if such a field exists.
        if "content" in block.fields and block.fields["content"].scope == Scope.content:
            text = node.text
            if text:
                text = text.strip()
                if text:
                    block.content = text

        return block

    def student_view(self, context=None):
        """
        The primary view of the WorldMapXBlock, shown to students
        when viewing courses.
        """
        delimiter = "?"   #TODO:  ugly...need to figure out a better way!
        try:
            self.worldmapConfig.get("href",None).index("?")
            delimiter = "&"
        except:
            pass


        uniqueId = self.getUniqueId()

        self.url =   self.worldmapConfig.get("href",None) + delimiter + "xblockId=worldmap_" + uniqueId
        self.width=  self.worldmapConfig.get("width",500)
        self.height= self.worldmapConfig.get("height",400)
        self.debug = self.worldmapConfig.get("debug",False)
        self.baseLayer = self.worldmapConfig.get("baseLayer",None)

        if not self.worldmapConfig.get('stickyMap',False):
            self.zoomLevel = self.worldmapConfig.get("zoom",None)
            self.centerLat = self.worldmapConfig.get("lat",None)
            self.centerLon = self.worldmapConfig.get("lon",None)


        html = self.resource_string("static/html/worldmap.html").format(self=self, uniqueId=uniqueId)
        #log.info(html)

        frag = Fragment(html)
        template = Template(self.resource_string("static/css/worldmap.css"))
        frag.add_css(template.substitute(imagesRoot=self.runtime.local_resource_url(self,"public/images")))
        frag.add_css(self.worldmapConfig.get('stylesheet',""))

#        frag.add_javascript(unicode(pkg_resources.resource_string(__name__, "static/js/src/xBlockCom-master.js")))
        frag.add_javascript_url(self.runtime.local_resource_url(self, "public/js/src/xBlockCom-master.js"))
#        frag.add_javascript(self.resource_string("static/js/src/worldmap.js"))
        frag.add_javascript_url(self.runtime.local_resource_url(self, "public/js/src/worldmap.js"))


        if not isinstance(self.scope_ids.usage_id, Location):
            frag.add_javascript_url("http://code.jquery.com/ui/1.10.3/jquery-ui.js")
            frag.add_css_url("http://code.jquery.com/ui/1.10.3/themes/smoothness/jquery-ui.css")
        frag.add_javascript_url(self.runtime.local_resource_url(self,"public/js/vendor/jNotify_jquery_min.js"))
        frag.add_javascript_url(self.runtime.local_resource_url(self,"public/js/vendor/jquery_ui_touch-punch_min.js"))
        frag.add_javascript_url(self.runtime.local_resource_url(self,"public/js/vendor/jquery_dynatree.js"))
        frag.add_css_url(self.runtime.local_resource_url(self,"public/css/vendor/jNotify_jquery.css"))
        frag.add_css_url(self.runtime.local_resource_url(self,"public/css/dynatree/skin/ui_dynatree.css"))

        frag.initialize_js('WorldMapXBlock')

        return frag


    def studio_view(self,context):
        """
        Studio edit view
        """

        delimiter = "?"
        try:
            self.worldmapConfig.get("href",None).index("?")
            delimiter = "&"
        except:
            pass

        uniqueId = self.getUniqueId()

        fragment = Fragment()

        print "creating worldmap-studio.html uniqueid="+uniqueId

        html = render_template('templates/html/worldmap-studio.html',
            {
                'display_name': self.display_name,
                'config_json': json.dumps(self.config),
                'worldmapConfig_json': json.dumps(self.worldmapConfig),
                'worldmapConfig_stylesheet': self.worldmapConfig.get('stylesheet','/* be careful, you can override edX styles here too */'),
                'prose': self.config.get("explanation"),
                'url': self.worldmapConfig.get("href",None),
                'delimiter': delimiter,
                'uniqueId': uniqueId,
                'imagesRoot': self.runtime.local_resource_url(self,"public/images")
            })

        fragment.add_content(html)

        fragment.add_css_url(self.runtime.local_resource_url(self,"public/css/worldmap-studio.css"))
        fragment.add_css_url(self.runtime.local_resource_url(self,"public/css/jquery-ui.css"))

        # why can't we do a fragment.add_javascript_url here?
        fragment.add_javascript(self.resource_string('public/js/jquery-ui-1.10.4.custom.js'))
        # fragment.add_javascript(self.resource_string('public/js/jquery-validation-min.js'))
        # fragment.add_javascript(self.resource_string('public/js/jquery-validation-additional-methods-min.js'))
        fragment.add_javascript(self.resource_string('public/js/src/worldmap-studio.js'))

        fragment.initialize_js('WorldMapEditBlock')
        return fragment

    @XBlock.json_handler
    def getConfig(self, data, suffix=''):
        return { 'result':'success' }

    @XBlock.json_handler
    def studio_submit(self, submissions, suffix=''):
      #   try:
      #      config =  json.loads(submissions['config'])
      #   except ValueError as e:
      #       return {'result': 'error', 'message': e.message, 'tab':'Questions'}
      #
      #   try:
      #       worldmapConfig =  json.loads(submissions['worldmapConfig'])
      #   except ValueError as e:
      #       return {'result': 'error', 'message':e.message, 'tab':'Map config'}
      #
      #   self.config = config
      #   self.worldmapConfig = worldmapConfig

        self.display_name = submissions['display_name']
        self.config['explanation'] = submissions['prose']
        self.config['highlights']  = submissions['highlights']
        self.config['questions']   = submissions['questions']
        if 'layer-controls' in submissions:
            self.worldmapConfig['layer-controls'] = fixupLayerTree(submissions['layer-controls'][0])
        self.worldmapConfig['href']  = submissions['href']
        self.worldmapConfig['lat']  = submissions['lat']
        self.worldmapConfig['lon']  = submissions['lon']
        self.worldmapConfig['zoom']  = submissions['zoom']
        self.worldmapConfig['height']= submissions['height']
        self.worldmapConfig['width']=  submissions['width']
        self.worldmapConfig['baseLayer'] = submissions['baseLayer']
        self.worldmapConfig['sliders']   = submissions['sliders']
        self.worldmapConfig['layers']    = submissions['layers']
        self.worldmapConfig['debug']     = submissions['debug']
        self.worldmapConfig['stickyMap'] = submissions['stickyMap']
        self.worldmapConfig['stylesheet']= submissions['stylesheet']

        return { 'result':'success' }

    #Radius of earth:
    SPHERICAL_DEFAULT_RADIUS = 6378137    #Meters

    @XBlock.json_handler
    def getStyleSheets(self, data, suffix=''):
        return {
            'globalStyleSheets' : self.globalStyleSheets,
            'usedStyleSheets'   : self.usedStyleSheets
        }

    @XBlock.json_handler
    def setGlobalStyleSheet(self, data, suffix=''):
        self.globalStyleSheets[data['name']] = data['data']

    @XBlock.json_handler
    def getSliderSetup(self, data, suffix=''):
        return self.worldmapConfig['sliders']

    @XBlock.json_handler
    def getLayerSpecs(self, data, suffix=''):
        return self.worldmapConfig['layers']

    @XBlock.json_handler
    def getLayerStates(self, data, suffix=''):
        for id in self.layerState:
            if self.layerState[id]['visibility'] == None:
                self.layerState[id]['visibility'] = False
        return self.layerState


    #IMPORTANT:  currently a point_response is adjudicated against only the first constraint (all others are ignored)
    @XBlock.json_handler
    def point_response(self, data, suffix=''):
        unsatisfiedConstraints = []
        correctGeometry = data['question']['constraints'][0]['geometry']
        userAnswer = data['point']
        latitude = userAnswer['lat']
        longitude= userAnswer['lon']
        hit = True

        if correctGeometry['type'] == 'polygon':
            hit = makePolygon(correctGeometry['points']).contains(makePoint(userAnswer))

        correctExplanation = ""
        percentCorrect = 100
        if not hit :
            correctExplanation = _("incorrect location")
            percentCorrect = 0
            unsatisfiedConstraints.append(data['question']['constraints'][0])

        self.setScore(data['question']['id'], percentCorrect, correctExplanation)

        return {
            'question':data['question'],
            'unsatisfiedConstraints': unsatisfiedConstraints,
            'percentCorrect': percentCorrect,
            'correctExplanation': correctExplanation,
            'isHit': hit
        }

    @XBlock.json_handler
    def polygon_response(self, data, suffix=''):

        arr = []
        for pt in data['polygon']:
            arr.append((pt['lon']+360., pt['lat']))

        try:
            answerPolygon = Polygon(arr)

            additionalErrorInfo = ""

            isHit = True

            totalIncorrect = 0
            unsatisfiedConstraints = []
            for constraint in data['question']['constraints']:
                constraintSatisfied = True

                if( constraint['type'] == 'matches'):

                    constraintPolygon = makePolygon(constraint['geometry']['points'])
                    overage = answerPolygon.difference(constraintPolygon).area
                    percentMatch = constraint['percentMatch']
                    constraintSatisfied = (overage*100/constraintPolygon.area < 1.5*(100-percentMatch))
                    if constraintSatisfied :
                        constraintSatisfied = (overage*100/answerPolygon.area < (100-percentMatch))
                        if constraintSatisfied :
                            constraintSatisfied = (constraintPolygon.difference(answerPolygon).area*100/constraintPolygon.area < (100-percentMatch))
                            if not constraintSatisfied :
                                additionalErrorInfo = _(" (polygon didn't include enough of correct area)")
                        else:
                            additionalErrorInfo = _(" (polygon didn't include enough of correct area)")
                    else:
                        additionalErrorInfo = _(" (polygon too big)")

                elif( constraint['type'] == 'includes' or constraint['type'] == 'excludes'):
                    if( constraint['geometry']['type'] == 'polygon' ):
                        constraintPolygon = makePolygon(constraint['geometry']['points'])

                        if( constraint['type'] == 'includes' ):
                            constraintSatisfied = constraintPolygon.difference(answerPolygon).area/constraintPolygon.area < 0.05 #allow 5% slop
                            if constraintSatisfied and constraint.get('maxAreaFactor',None) != None :
                                constraintSatisfied = answerPolygon.area/constraintPolygon.area < constraint['maxAreaFactor']
                                if not constraintSatisfied :
                                    additionalErrorInfo = _(" (polygon too big)")
                            else:
                                if( answerPolygon.disjoint(constraintPolygon) ):
                                    additionalErrorInfo = _(" (polygon not drawn around proper area)")
                                elif( not answerPolygon.contains(constraintPolygon)):
                                    additionalErrorInfo = _(" (you hit a piece of the right area, but not enough)")
                        else: #EXCLUDES
                            constraintSatisfied = constraintPolygon.difference(answerPolygon).area/constraintPolygon.area > 0.95 #allow for 5% slop
                    elif( constraint['geometry']['type'] == 'point' ):
                        if( constraint['type'] == 'includes' ):
                            constraintSatisfied = answerPolygon.contains(makePoint(constraint['geometry']['points'][0]))

                            if not constraintSatisfied :
                               additionalErrorInfo = _(" (polygon missed a key location)")
                        else:
                            constraintSatisfied = answerPolygon.disjoint(makePoint(constraint['geometry']['points'][0]))
                    elif( constraint['geometry']['type'] == 'polyline' ):
                        constraintLine = makeLineString(constraint['geometry']['points'])
                        if( constraint['type'] == 'includes' ) :
                            constraintSatisfied = answerPolygon.contains( constraintLine )
                            if not constraintSatisfied :
                               additionalErrorInfo = _(" (polygon does not include a key polyline)")
                        else:
                            constraintSatisfied = not answerPolygon.disjoint( constraintLine )
                            if not constraintSatisfied :
                               additionalErrorInfo = _(" (polygon includes a key polyline that it should not include)")

                if not constraintSatisfied :
                    totalIncorrect += constraint['percentOfGrade']
                    unsatisfiedConstraints.append(constraint)

                isHit = isHit and constraintSatisfied

        except TopologicalError:
            return {
                'question':data['question'],
                'isHit': False,
                'error': _('Invalid polygon topology')+'<br/><img src="'+self.runtime.local_resource_url(self,"public/images/InvalidTopology.png")+'"/>'
            }
        except ValueError:
            return {
                'question': data['question'],
                'isHit': False,
                'error': _('Invalid polygon topology')+'<br/><img src="'+self.runtime.local_resource_url(self,"public/images/InvalidTopology.png")+'"/>'
            }
        except:
            print _("Unexpected error: "), sys.exc_info()[0]
            return {
                'question':data['question'],
                'isHit': False,
                'error': _("Unexpected error: "+sys.exc_info()[0])
            }

        percentIncorrect = math.min( totalIncorrect, 100);

        correctExplanation = "{:.0f}% incorrect".format(percentIncorrect)+additionalErrorInfo
        self.setScore(data['question']['id'], 100-percentIncorrect, correctExplanation)

        return {
            'question':data['question'],
            'unsatisfiedConstraints': unsatisfiedConstraints,
            'isHit': isHit,
            'percentCorrect': 100-percentIncorrect,
            'correctExplanation': correctExplanation
        }

    @XBlock.json_handler
    def polyline_response(self, data, suffix=''):

        arr = []
        for pt in data['polyline']:
            arr.append((pt['lon']+360., pt['lat']))

        answerPolyline = LineString(arr)
        additionalErrorInfo = ""

        isHit = True
        try:

            totalIncorrect = 0
            unsatisfiedConstraints = []
            for constraint in data['question']['constraints']:
                constraintSatisfied = True

                if constraint['type'] == 'matches' : #polyline
                    percentMatch = constraint['percentMatch']
                    # answerPolygon  = answerPolyline.buffer(self.scale(constraint['padding']))
                    constraintPolyline = makeLineString(constraint['geometry']['points'])

                    buffer = constraintPolyline.length*0.2

                    constraintPolygon = constraintPolyline.buffer(buffer)

                    constraintSatisfied = constraintPolygon.contains(answerPolyline)

                    if constraintSatisfied:
                        constraintSatisfied = abs(constraintPolyline.length - answerPolyline.length)/constraintPolyline.length < (100-percentMatch)/100.
                        if not constraintSatisfied:
                            if (constraintPolyline.length - answerPolyline.length > 0) :
                                additionalErrorInfo =  _(" - The polyline wasn't long enough")
                            else:
                                additionalErrorInfo =  _(" - The polyline was too long")
                    else:
                        additionalErrorInfo = _(" - You missed the proper area")

                elif constraint['type'] == "inside": #polygon
                    constraintPolygon = makePolygon(constraint['geometry']['points'])
                    constraintSatisfied = constraintPolygon.contains(answerPolyline)
                    if not constraintSatisfied:
                        additionalErrorInfo = _(" - Outside permissible boundary")
                elif constraint['type'] == 'excludes': #polygon
                    constraintPolygon = makePolygon(constraint['geometry']['points'])
                    constraintSatisfied = not constraintPolygon.crosses(answerPolyline)
                    if not constraintSatisfied:
                        additionalErrorInfo = _(" - Must be outside of a certain boundary")
                elif constraint['type'] == 'includes':  #point
                    constraintPointArea = makePoint(constraint['geometry'['points'][0]]).buffer(answerPolyline.length*0.1)  #radius around point = 10% of length of polyline
                    constraintSatisfied = constraintPointArea.crosses(answerPolyline)
                    if not constraintSatisfied:
                        additionalErrorInfo = _(" - Must include a particular point")

                if not constraintSatisfied :
                    totalIncorrect += constraint['percentOfGrade']
                    unsatisfiedConstraints.append(constraint)

                isHit = isHit and constraintSatisfied

        except:
            print _("Unexpected error: "), sys.exc_info()[0]

        percentIncorrect = math.min( 100, totalIncorrect);

        correctExplanation = "{:.0f}% incorrect".format(percentIncorrect)+additionalErrorInfo

        self.setScore(data['question']['id'], 100-percentIncorrect, correctExplanation)

        return {
            'question':data['question'],
            'unsatisfiedConstraints': unsatisfiedConstraints,
            'isHit': isHit,
            'percentCorrect': 100-percentIncorrect,
            'correctExplanation': correctExplanation
        }

    def scale(self, val):
        return val*180/(math.pi*self.SPHERICAL_DEFAULT_RADIUS)

    @XBlock.json_handler
    def getQuestions(self, data, suffix=''):
        return {
            'explanation': self.config.get('explanation',[]),
            'questions': self.config.get('questions',[]),
            'scores': self.scores
        }

    @XBlock.json_handler
    def getGeometry(self, id, suffix=''):
        for highlight in self.config.get('highlights',[]):  # pylint: disable=E1101
            if ( highlight['id'] == id ):
                return highlight['geometry']
        return None

    @XBlock.json_handler
    def getFuzzyGeometry(self, data, suffix=''):

        buffer = self.scale(data['buffer'])

        # create a bunch of polygons that are more/less the shape of our original geometry
        geometryArr = []
        if data['type'] == 'point':
            buffer = max(self.scale(10), buffer)    # for a point, a minimum buffer of 10 meters is necessary - otherwise it doesn't show up on the map.
            point = Point(data['geometry'][0]['lon']+360., data['geometry'][0]['lat'])
            geometryArr.append( point.buffer(buffer))
            geometryArr.append( point.buffer(buffer*2))
            geometryArr.append( point.buffer(buffer*4))
            geometryArr.append( point.buffer(buffer*8))
        elif data['type'] == 'polygon' or data['type'] == 'polyline':
            arr = []
            if data['type'] == 'polygon':
                for pt in data['geometry']:
                    arr.append((pt['lon']+360., pt['lat']))
                polygon = Polygon(arr)
            else:
                for pt in data['geometry']:
                    arr.append((pt['lon']+360., pt['lat']))
                polyline = LineString(arr)
                buffer = max(buffer, 0.1*polyline.length)
                polygon = LineString(arr).buffer(buffer)

            geometryArr.append( polygon.buffer(buffer*1.5))
            geometryArr.append( polygon.buffer(buffer*.5 ))
            geometryArr.append( polygon.buffer(2*buffer).buffer(-2*buffer) )
            p = polygon.buffer(-buffer)
            if( p.area > 0 ):
               geometryArr.append( p )


        # move these polygons around a bit randomly

        r = []
        for g in geometryArr:
            arr = []
            for i in range(0,2):   # give it a bit of a "blobby look"
                arr.append(affinity.translate(g, 4*buffer*randrange(-500,500)/1000., 4*buffer*randrange(-500,500)/1000.,0))
            # union these randomly moved polygons back together and get their convex_hull
            hull = ops.cascaded_union(arr).convex_hull
            for i in range(0,10):
                r.append( affinity.translate(hull, 4*buffer*randrange(-500,500)/1000., 4*buffer*randrange(-500,500)/1000.,0))

        # output the polygons
        result = []
        for polygon in r:
            poly = []
            if( not polygon.is_empty ):
                for pt in polygon.exterior.coords:
                    poly.append( { 'lon': pt[0]-360., 'lat': pt[1]} )
                result.append(poly)

        return result

    @XBlock.json_handler
    def getExplanation(self,data,suffix=''):
        return self.explanationHTML


    @property
    def questions(self):
        return self.config.get('questions',[])


    def setScore(self, questionId, score, explanation):
        self.scores[questionId] = { 'score': score, 'explanation':explanation}

        maxScore = 0;
        myScore = 0;
        for question in self.config['questions']:
            maxScore += 100
            if question['id'] in self.scores and type(self.scores[question['id']]) is dict and 'score' in self.scores[question['id']]:
                myScore += self.scores[question['id']]['score']

        self.runtime.publish(self,'grade', { 'value': myScore, 'max_score': maxScore})


    @XBlock.json_handler
    def layerTree(self, data, suffix=''):
        """
        Called to get layer tree for a particular map
        """
        return self.worldmapConfig.get('layer-controls', [])

    @XBlock.json_handler
    def set_zoom_level(self, data, suffix=''):
        """
        Called when zoom level is changed
        """
        if not data.get('zoomLevel'):
            log.warn('zoomLevel not found')
        else:
            self.zoomLevel = int(data.get('zoomLevel'))

        return {'zoomLevel': self.zoomLevel}

    @XBlock.json_handler
    def change_layer_properties(self, data, suffix=''):
        """
        Called when layer properties have changed
        """
        id = data.get('id')
        if not id:
            log.warn('no layerProperties found')
            return False
        else:
            # we have a threading problem... need to behave in single-threaded mode here
          #  self.threadLock.acquire()
            visibility = data.get('visibility')
            if( visibility == None):
                visibility = False
            self.layerState[id] = { 'id': id, 'name':data.get('name'), 'opacity':data.get('opacity'), 'visibility':visibility}
          #  self.threadLock.release()

            pass
        return True

    @XBlock.json_handler
    def getViewInfo(self, data, suffix=''):
        """
        return most recent zoomLevel, center location
        """
        if self.zoomLevel == None or self.centerLat == None or self.centerLon == None:
            return None
        else:
            return {
                'zoomLevel': self.zoomLevel,
                'centerLat': self.centerLat,
                'centerLon': self.centerLon
            }

    @XBlock.json_handler
    def set_center(self, data, suffix=''):
        """
        Called when window zoomed/scrolled
        """
        if not data.get('centerLat'):
            log.warn('centerLat not found')
            return False
        else:
            self.centerLat = data.get('centerLat')
            self.centerLon = data.get('centerLon')
            self.zoomLevel = data.get('zoomLevel')

        return True


    # TO-DO: change this to create the scenarios you'd like to see in the
    # workbench while developing your XBlock.
    @staticmethod
    def workbench_scenarios():
        """A canned scenario for display in the workbench."""
        return [
            ("WorldMapXBlock",
             """
             <vertical_demo>
                 <worldmap/>
                 <worldmap/>
             </vertical_demo>
             """
            ),
        ]

