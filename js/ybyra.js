//--------------------------------------------------------------------------\\
//  Ybyrá 1.0.0 - JavaScript Hyperbolic Tree Library                        \\
//--------------------------------------------------------------------------\\
//  http://ybyra.manish.com.br - 2013 - Sidney Leal                         \\
//--------------------------------------------------------------------------\\
//                                                                          \\
//  This program is free software: you can redistribute it and/or modify    \\
//  it under the terms of the GNU General Public License as published by    \\
//  the Free Software Foundation, either version 3 of the License, or       \\
//  (at your option) any later version.                                     \\
//                                                                          \\
//  This program is distributed in the hope that it will be useful,         \\
//  but WITHOUT ANY WARRANTY; without even the implied warranty of          \\
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the           \\
//  GNU General Public License for more details.                            \\
//                                                                          \\
//  You should have received a copy of the GNU General Public License       \\
//  along with this program.  If not, see <http://www.gnu.org/licenses/>.   \\
//                                                                          \\
//--------------------------------------------------------------------------\\
//                                                                          \\
// Many thanks to: Christophe Bouthier (http://christ.bouthier.free.fr) and \\
// his open-source java hypertree: http://hypertree.sourceforge.net         \\
//                                                                          \\
// Many thanks to: Dmitry Baranovskiy (http://dmitry.baranovskiy.com/) and  \\
// his open-source javascript svg library Raphael: http://raphaeljs.com     \\
//                                                                          \\
//--------------------------------------------------------------------------\\

var EPSILON = 1.0E-10;

var ybyra = {
    paper : null,
    screenWidth : 1024,
    screenHeight : 768,
    iconSize : 80,
    nodeDistance : 0.3, // distance between node and children
    rootNode : null,
    container : null,
    click : function(node) {
    },
    branchColor : "#00f",
    branchWidth : 2,
    labelBorderWidth : 200,
    labelBorderHeight : 50,
    labelBorderColor : 'white',
    textColor : "#00f",
    textSize : 15,
    plusIcon : "plus.png",
    minusIcon : "minus.png",
    screenMax : { // the (xMax, yMax) point in the screen plane
        x : 0,
        y : 0
    },
    screenOrigin : { // the origin of the screen plane
        x : 0,
        y : 0
    },
    screenInsets : {
        left : 0,
        right : 0,
        top : 0,
        bottom : 0
    },
    zoom : 0,
	animateLinks: false,
	mouseWheelZoomEnabled: true,

    refreshTree : function() {
        this.screenWidth = this.container.clientWidth;
        this.screenHeight = this.container.clientHeight;

        var firstTime = this.paper == null;
        if (firstTime) {
            this.paper = Raphael(this.container, this.screenWidth, this.screenHeight);
            HTree.createBackground();
        } else {
            this.paper.setSize(this.screenWidth, this.screenHeight);
        }
        HTree.fillWeight(this.rootNode);
        HTree.refreshScreenCoordinates();
        HTree.layoutNode(this.rootNode, 0, Math.PI, this.iconSize);
        HTree.drawNode(this.rootNode);
        if (firstTime) {
            HTree.animateLinks(this.rootNode);
        }
    }

};

var HTree = {

    createBackground : function() {
        var back = ybyra.paper.rect(0, 0, ybyra.screenWidth, ybyra.screenHeight);
        back.attr("fill", "white");
        back.attr("fill-opacity", 0.01);
        back.attr("stroke", "transparent");

        back.drag(function(mx, my) {
            var newRootPointS = {
                x : originalRootPoint.x + mx,
                y : originalRootPoint.y + my
            };
            var newRootPointE = HTCoordS.projectionPointStoE(newRootPointS);
            ybyra.rootNode.coordE = newRootPointE;
            ybyra.refreshTree();
        }, function(sx, sy) {
            originalRootPoint = {
                x : ybyra.rootNode.coordS.x,
                y : ybyra.rootNode.coordS.y
            };
        });

        back.node.addEventListener("mousewheel", HTree.mouseWheelHandler, false);
    },

    mouseWheelHandler : function(event) {
    	if (ybyra.mouseWheelZoomEnabled) {
	        if (event.wheelDelta > 0) {
	            ybyra.zoom += 0.1;
	        } else {
	            ybyra.zoom -= 0.1;
	        }
	        if (ybyra.zoom < -0.3) {
	        	ybyra.zoom = -0.3;
	        }
	        if (ybyra.zoom > 1.5) {
	        	ybyra.zoom = 1.5;
	        }
	        ybyra.refreshTree();
    	}
    },

    /**
     * Refresh the screen coordinates of the drawing tree.
     */
    refreshScreenCoordinates : function() {
        ybyra.screenMax.x = (ybyra.screenWidth - ybyra.screenInsets.left - ybyra.screenInsets.right) / 2;
        ybyra.screenMax.y = (ybyra.screenHeight - ybyra.screenInsets.top - ybyra.screenInsets.bottom) / 2;
        ybyra.screenOrigin.x = ybyra.screenMax.x + ybyra.screenInsets.left;
        ybyra.screenOrigin.y = ybyra.screenMax.y + ybyra.screenInsets.top;
    },

    /**
     * Layout this node in the hyperbolic space. First set the point at the
     * right distance, then translate by father's coordinates. Then, compute the
     * right angle and the right width. Thanks to: Christophe Bouthier
     * 
     * @param angle
     *            the angle from the x axis (bold as love)
     * @param width
     *            the angular width to divide, / 2
     * @param length
     *            the parent-child length
     * 
     */
    layoutNode : function(node, angle, width, length) {
        // if root node
        if (node.parent == null) {
            if (node.coordE == null) {
                node.coordE = {
                    x : 0,
                    y : 0
                };
            }

        } else {
            var coordEParent = node.parent.coordE;
            var coordE = {};

            // We first start as if the parent was the origin.
            // We still are in the hyperbolic space.
            coordE.x = length * Math.cos(angle);
            coordE.y = length * Math.sin(angle);

            // Then translate by parent's coordinates
            HTCoordE.translate(coordE, coordEParent);

            node.coordE = coordE;

            // Compute the new starting angle
            // e(i a) = T(z)oT(zp) (e(i angle))
            var a = {
                x : Math.cos(angle),
                y : Math.sin(angle)
            };

            var nz = {
                x : -coordE.x,
                y : -coordE.y
            };

            HTCoordE.translate(a, coordEParent);
            HTCoordE.translate(a, nz);
            angle = HTCoordE.arg(a);

            // Compute the new width
            // e(i w) = T(-length) (e(i width))
            // decomposed to do it faster :-)
            var c = Math.cos(width);
            var A = 1 + length * length;
            var B = 2 * length;
            width = Math.acos((A * c - B) / (A - B * c));

        }

        if (node.children != null && node.expanded) {

            this.computeWeight(node);

            var nbrChild = node.children.length;
            var l1 = (0.95 - ybyra.nodeDistance);
            var l2 = Math.cos((20.0 * Math.PI) / (2.0 * nbrChild + 38.0));
            length = ybyra.nodeDistance + (l1 * l2);

            var startAngle = angle - width;

            for ( var i = 0; i < node.children.length; i++) {
                var child = node.children[i];
                child.parent = node;

                var percent = child.weight / node.globalWeight;

                var childWidth = width * percent;
                var childAngle = startAngle + childWidth;
                this.layoutNode(child, childAngle, childWidth, length);
                startAngle += 2.0 * childWidth;
            }
        }

    },

    fillWeight : function(node) {
        if (node.weight == null) {
            node.weight = 1;
        }
        if (node.children != null) {
            for ( var i = 0; i < node.children.length; i++) {
                var child = node.children[i];
                this.fillWeight(child);
            }
        }
    },

    computeWeight : function(node) {
        var globalWeight = 0;
        var weight = node.weight;
        if (node.children != null) {
            for ( var i = 0; i < node.children.length; i++) {
                var child = node.children[i];
                if (node.expanded) {
                    globalWeight += child.weight;
                }
            }
            if (globalWeight != 0) {
                weight += Math.log(globalWeight);
            }
        }
        node.globalWeight = globalWeight;
        // node.weight = weight; //TODO: checar isso
    },

    drawNode : function(node) {

        HTCoordS.projectionEtoS(node);

        node.distanceFromCenter = (Math.abs(node.coordE.x) + Math.abs(node.coordE.y)) / 2;

        // draw node image
        if (node.icon != null) {
            if (node.image == null) {
                this.drawNodeImage(node);
            }
            this.drawNodeImageLabel(node);

        } else {
            this.drawNodeLabelOnly(node);
        }

        // draw the plus / minus icon
        if (node.children != null) {
            this.drawPlusMinusImage(node);
        }

        // draw node branch
        if (node.parent != null) {
            this.drawNodeBranch(node);
        }

        if (node.children != null && node.expanded) {
            for ( var i = 0; i < node.children.length; i++) {
                var child = node.children[i];
                this.drawNode(child);
            }
        }

        this.showNode(node);
    },

    drawNodeImage : function(node) {
        var img = ybyra.paper.image(node.icon, 0, 0, ybyra.iconSize, ybyra.iconSize);
        img.attr("cursor", "pointer");
        node.image = img;
        this.handleActions(node, img);
        img.node.addEventListener("mousewheel", HTree.mouseWheelHandler, false);
    },

    drawNodeLabel : function(node) {
        var label = ybyra.paper.text(0, 0, node.name);
        label.attr("fill", ybyra.textColor);
        label.attr("font-size", ybyra.textSize);
        node.label = label;
    },

    drawNodeImageLabel : function(node) {

        var imgTransform = "t" + (node.coordS.x - (ybyra.iconSize / 2)) + "," + (node.coordS.y - (ybyra.iconSize / 2))
                + "s" + (ybyra.zoom + 1 - node.distanceFromCenter);
        node.image.stop().transform(imgTransform);

        // draw node label for image
        if (node.label == null) {
            this.drawNodeLabel(node);
        }

        if (node.labelPosition == null) {
            node.labelPosition = {
                x : 0,
                y : 0
            };
        }

        var labelTransform = "t"
                + (node.coordS.x + node.labelPosition.x)
                + ","
                + (node.coordS.y + ((ybyra.iconSize * (ybyra.zoom + 1 - node.distanceFromCenter)) / 2) + 10 + node.labelPosition.y)
                + "s" + (ybyra.zoom + 1 - node.distanceFromCenter);
        node.label.transform(labelTransform);

    },

    drawNodeLabelOnly : function(node) {

        if (node.labelBorder == null) {
            var borderSet = ybyra.paper.set();

            var border = ybyra.paper.rect(0, 0, ybyra.labelBorderWidth, ybyra.labelBorderHeight, 30);
            border.attr("fill", ybyra.labelBorderColor);
            border.attr("stroke", ybyra.labelBorderColor);
            border.attr("cursor", "pointer");

            borderSet.push(border);

            this.drawNodeLabel(node);

            // TODO: this smells.. but we don't have real groups in Raphael yet
            // :-(
            var borderAction = ybyra.paper.rect(0, 0, ybyra.labelBorderWidth, ybyra.labelBorderHeight, 30);
            borderAction.attr("fill", ybyra.labelBorderColor);
            borderAction.attr("stroke", ybyra.labelBorderColor);
            borderAction.attr("fill-opacity", 0.01);

            borderSet.push(borderAction);

            node.labelBorder = borderSet;
            this.handleActions(node, borderSet);
            borderAction.node.addEventListener("mousewheel", HTree.mouseWheelHandler, false);

        }
        var labelBorderTransform = "t" + (node.coordS.x - (ybyra.labelBorderWidth / 2)) + ","
                + (node.coordS.y - (ybyra.labelBorderHeight / 2)) + "s" + (ybyra.zoom + 1 - node.distanceFromCenter);
        node.labelBorder.stop().transform(labelBorderTransform);

        var labelTransform = "t" + (node.coordS.x) + "," + (node.coordS.y) + "s"
                + (ybyra.zoom + 1 - node.distanceFromCenter);
        node.label.stop().transform(labelTransform);

    },

    drawNodeBranch : function(node) {
        var controlE = HTCoordE.calculateQCurveControlPoint(node.parent.coordE, node.coordE);
        var controlS = HTCoordS.projectionPointEtoS(controlE);

        var curvePath = "M " + node.parent.coordS.x + "," + node.parent.coordS.y;
        if (controlE.isLine) {
            curvePath += " L ";
        } else {
            curvePath += " Q " + controlS.x + "," + controlS.y + " ";
        }
        curvePath += node.coordS.x + "," + node.coordS.y;

        if (node.link == null) {
            var curve = ybyra.paper.path(curvePath);
            curve.attr("stroke", ybyra.branchColor);
            curve.attr("stroke-width", ybyra.branchWidth);
            node.link = curve;
        }
        node.link.attr({
            path : curvePath
        });

    },

    drawPlusMinusImage : function(node) {
        if (node.plusImage == null) {
            var imgComposite = ybyra.paper.image(ybyra.plusIcon, 0, 0, ybyra.iconSize / 3, ybyra.iconSize / 3);
            node.plusImage = imgComposite;
            node.plusImage.click(function() {
                node.expanded = true;
                ybyra.refreshTree();
                node.plusImage.hide();
                node.minusImage.show();
                HTree.animateLinks(node);
            });
        }
        if (node.minusImage == null) {
            var imgComposite = ybyra.paper.image(ybyra.minusIcon, 0, 0, ybyra.iconSize / 3, ybyra.iconSize / 3);
            node.minusImage = imgComposite;
            node.minusImage.click(function() {
                node.expanded = false;
                ybyra.refreshTree();
                node.plusImage.show();
                node.minusImage.hide();
                HTree.hideNodeChildren(node);
            });
        }
        var imgCompositeTransform = "t"
                + (node.coordS.x - (ybyra.iconSize / 2) + ((ybyra.iconSize / 3) * node.distanceFromCenter)) + ","
                + (node.coordS.y - (ybyra.iconSize / 2) + ((ybyra.iconSize / 3) * node.distanceFromCenter)) + "s"
                + (1 - node.distanceFromCenter);
        if (node.expanded) {
            node.plusImage.hide();
            node.minusImage.show();
            node.minusImage.stop().transform(imgCompositeTransform);
        } else {
            node.minusImage.hide();
            node.plusImage.show();
            node.plusImage.stop().transform(imgCompositeTransform);
        }
    },

    animateLinks : function(node) {
        var links = ybyra.paper.set();
        this.groupLinks(links, node);

		if (ybyra.animateLinks) {
			var animBack = Raphael.animation({
				opacity : 1,
				easing : '<'
			}, 3e3, function() {
				links.stop().animate(anim);
			});
			var anim = Raphael.animation({
				opacity : 0.3,
				easing : '<'
			}, 3e3, function() {
				links.stop().animate(animBack);
			});
			links.animate(anim);
		}
        links.toBack();
    },

    groupLinks : function(links, node) {
        if (node.children != null && node.expanded) {
            for ( var i = 0; i < node.children.length; i++) {
                var child = node.children[i];
                links.push(child.link);
                this.groupLinks(links, child);
            }
        }
    },

    hideNodeChildren : function(node) {
        if (node.children != null) {
            for ( var i = 0; i < node.children.length; i++) {
                var child = node.children[i];
                this.hideNode(child);
            }
        }
    },

    hideNode : function(node) {

        node.label.hide();
        if (node.image != null) {
            node.image.hide();
        }
        if (node.link != null) {
            node.link.hide();
        }
        if (node.labelBorder != null) {
            node.labelBorder.hide();
        }
        if (node.children != null) {
            node.plusImage.hide();
            node.minusImage.hide();
            if (node.expanded) {
                for ( var i = 0; i < node.children.length; i++) {
                    var child = node.children[i];
                    this.hideNode(child);
                }
            }
        }
    },

    showNode : function(node) {
        node.label.show();
        if (node.image != null) {
            node.image.show();
        }
        if (node.link != null) {
            node.link.show();
        }
        if (node.labelBorder != null) {
            node.labelBorder.show();
        }
    },

    handleActions : function(node, item) {

        var isDragging = false;
        var originalRootPoint = {
            x : 0,
            y : 0
        };

        item.click(function() {
            if (node.children != null && !isDragging) {
                node.expanded = !node.expanded;
                ybyra.refreshTree();
                if (node.expanded) {
                    HTree.animateLinks(node);
                    HTTransformation.translateToOrigin(node);
                } else {
                    HTree.hideNodeChildren(node);
                }
            }

            if (!isDragging) {
                ybyra.click(node);
            }

            isDragging = false;
        });

        item.drag(function(mx, my) {
            var newRootPointS = {
                x : originalRootPoint.x + mx,
                y : originalRootPoint.y + my
            };
            isDragging = true;
            var newRootPointE = HTCoordS.projectionPointStoE(newRootPointS);
            ybyra.rootNode.coordE = newRootPointE;
            ybyra.refreshTree();
        }, function(sx, sy) {
            originalRootPoint = {
                x : ybyra.rootNode.coordS.x,
                y : ybyra.rootNode.coordS.y
            };
        });

        var imageOrBorderAdjustX = 0;
        var imageOrBorderAdjustY = 0;
        if (node.icon != null) {
            imageOrBorderAdjustX = ybyra.iconSize / 2;
            imageOrBorderAdjustY = ybyra.iconSize / 2;
        } else {
            imageOrBorderAdjustX = ybyra.labelBorderWidth / 2;
            imageOrBorderAdjustY = ybyra.labelBorderHeight / 2;
        }

        var labelOriginalScale = 0;

        item.mouseover(
                function() {
                    item.stop().animate(
                            {
                                transform : "t" + (node.coordS.x - imageOrBorderAdjustX) + ","
                                        + (node.coordS.y - imageOrBorderAdjustY) + "s"
                                        + (ybyra.zoom + 1 - node.distanceFromCenter + 0.5)
                            }, 300);

                    if (node.image == null) {
                        var transf = (node.label.transform() + "").split("s");
                        labelOriginalScale = transf[1];
                        node.label.stop().animate({
                            transform : transf[0] + "s" + (parseFloat(labelOriginalScale) + 0.5)
                        }, 300);
                    }
                }).mouseout(
                function() {
                    item.stop().animate(
                            {
                                transform : "t" + (node.coordS.x - imageOrBorderAdjustX) + ","
                                        + (node.coordS.y - imageOrBorderAdjustY) + "s"
                                        + (ybyra.zoom + 1 - node.distanceFromCenter)
                            }, 800);

                    if (node.image == null) {
                        var transf = (node.label.transform() + "").split("s");
                        node.label.stop().animate({
                            transform : transf[0] + "s" + (labelOriginalScale)
                        }, 800);
                    }

                });

    }

};

/**
 * The HTCoordE class implements the coordinates of a point in the Euclidian
 * space.
 */
var HTCoordE = {

    /**
     * Returns the square of the distance from the origin to this point.
     */
    d2 : function(coordE) {
        return (coordE.x * coordE.x) + (coordE.y * coordE.y);
    },

    /**
     * Returns the distance from the origin to this point.
     */
    d : function(coordE) {
        return Math.sqrt(this.d2(coordE));
    },

    /**
     * Translate this Euclidian point by the coordinates of the given Euclidian
     * point.
     * 
     * @param o
     *            the coordinates to translate
     * @param t
     *            the translation coordinates
     */
    translate : function(o, t) {
        // z = (z + t) / (1 + z * conj(t))

        // first the denominator
        var denX = (o.x * t.x) + (o.y * t.y) + 1;
        var denY = (o.y * t.x) - (o.x * t.y);
        var dd = (denX * denX) + (denY * denY);

        // and the numerator
        var numX = o.x + t.x;
        var numY = o.y + t.y;

        // then the division (bell)
        o.x = ((numX * denX) + (numY * denY)) / dd;
        o.y = ((numY * denX) - (numX * denY)) / dd;
    },

    /**
     * Calculate the control point to the quadratic curve for links.
     */
    calculateQCurveControlPoint : function(za, zb) {
        var zc = {};
        if ((Math.abs(this.d(za)) < EPSILON) || // za == origin
        (Math.abs(this.d(zb)) < EPSILON) || // zb == origin
        (Math.abs((za.x / zb.x) - (za.y / zb.y)) < EPSILON)) {// za =
                                                                // lambda.zb
            zc.isLine = true; // type = LINE;

        } else {
            zc.isLine = false; // type = ARC;

            var da = 1 + za.x * za.x + za.y * za.y;
            var db = 1 + zb.x * zb.x + zb.y * zb.y;
            var dd = 2 * (za.x * zb.y - zb.x * za.y);

            var zo = {};
            zo.x = (zb.y * da - za.y * db) / dd;
            zo.y = (za.x * db - zb.x * da) / dd;

            var det = (zb.x - zo.x) * (za.y - zo.y) - (za.x - zo.x) * (zb.y - zo.y);
            var fa = za.y * (za.y - zo.y) - za.x * (zo.x - za.x);
            var fb = zb.y * (zb.y - zo.y) - zb.x * (zo.x - zb.x);

            zc.x = ((za.y - zo.y) * fb - (zb.y - zo.y) * fa) / det;
            zc.y = ((zo.x - za.x) * fb - (zo.x - zb.x) * fa) / det;

        }

        return zc;
    },

    /**
     * Returns the angle between the x axis and the line passing throught the
     * origin O and this point. The angle is given in radians.
     * 
     * @return the angle, in radians
     */
    arg : function(coordE) {
        var a = Math.atan(coordE.y / coordE.x);
        if (coordE.x < 0) {
            a += Math.PI;
        } else if (coordE.y < 0) {
            a += 2 * Math.PI;
        }
        return a;
    },

    /**
     * Multiply this coordinate by the given coordinate.
     */
    multiply : function(o, z) {
        var tx = o.x;
        var ty = o.y;
        o.x = (tx * z.x) - (ty * z.y);
        o.y = (tx * z.y) + (ty * z.x);
    },

    /**
     * Divide this coordinate by the given coordinate.
     */
    divide : function(o, z) {
        var d = this.d2(z);
        var tx = o.x;
        var ty = o.y;
        o.x = ((tx * z.x) + (ty * z.y)) / d;
        o.y = ((ty * z.x) - (tx * z.y)) / d;
    }

};

/**
 * The HTCoordS class implements the coordinates of a point in the Screen space.
 * The screen space is represented with finite pixels. Thanks to: Christophe
 * Bouthier
 */
var HTCoordS = {

    /**
     * Projects the given Euclidian point on the screen plane.
     */
    projectionPointEtoS : function(pointE) {
        var pointS = {};
        pointS.x = Math.round(pointE.x * ybyra.screenMax.x) + ybyra.screenOrigin.x;
        pointS.y = -Math.round(pointE.y * ybyra.screenMax.y) + ybyra.screenOrigin.y;
        return pointS;
    },

    projectionEtoS : function(node) {
        node.coordS = this.projectionPointEtoS(node.coordE);
    },

    /**
     * Projects from Screen to Euclidian.
     * 
     * @param x
     *            the x screen coordinate
     * @param y
     *            the y screen coordinate
     * @param sOrigin
     *            the origin of the screen plane
     * @param sMax
     *            the (xMax, yMax) point in the screen plane
     */
    projectionPointStoE : function(pointS) {
        var pointE = {};
        pointE.x = (pointS.x - ybyra.screenOrigin.x) / ybyra.screenMax.x;
        pointE.y = -((pointS.y - ybyra.screenOrigin.y) / ybyra.screenMax.y);
        return pointE;
    },

    projectionStoE : function(node) {
        node.coordE = this.projectionPointStoE(node.coordS);
    }

};

/**
 * The HTTransformation class implements a isometrie transformation in the
 * hyperbolic space.
 */
var HTTransformation = {

    translateToOrigin : function(node) {
        var zn = {
            x : node.coordE.x,
            y : node.coordE.y
        };

        var NBR_FRAMES = 10;
        var frames = NBR_FRAMES;

        var ray = [];
        ray[0] = ybyra.nodeDistance;
        for ( var i = 1; i < 4; i++) {
            ray[i] = (ray[0] + ray[i - 1]) / (1 + (ray[0] * ray[i - 1]));
        }

        var d = HTCoordE.d(zn);
        for ( var i = 0; i < ray.length; i++) {
            if (d > ray[i]) {
                frames += NBR_FRAMES / 2;
            }
        }

        var factorX = zn.x / frames;
        var factorY = zn.y / frames;

        var oldCoordinates = {
            x : ybyra.rootNode.coordE.x,
            y : ybyra.rootNode.coordE.y
        };

        this.animateTranslation(frames, 1, oldCoordinates, zn, factorX, factorY);
    },

    animateTranslation : function(frames, i, oldCoordinates, zn, factorX, factorY) {
        var zf = {
            x : 0,
            y : 0
        };

        var k = i;
        zf.x = zn.x - (k * factorX);
        zf.y = zn.y - (k * factorY);
        this.translate(oldCoordinates, zn, zf);
        ybyra.refreshTree();

        if (i <= frames) {
            i++;
            setTimeout(function() {
                HTTransformation.animateTranslation(frames, i, oldCoordinates, zn, factorX, factorY);
            }, 1);
        }
    },

    /**
     * Translates the hyperbolic tree by the given vector.
     */
    translate : function(oldCoordinates, zs, ze) {
        var zo = {
            x : oldCoordinates.x,
            y : oldCoordinates.y
        };
        zo.x = -zo.x;
        zo.y = -zo.y;
        zs2 = {
            x : zs.x,
            y : zs.y
        };
        HTCoordE.translate(zs2, zo);

        var t = {};
        var de = HTCoordE.d2(ze);
        var ds = HTCoordE.d2(zs2);
        var dd = 1.0 - de * ds;
        t.x = (ze.x * (1.0 - ds) - zs2.x * (1.0 - de)) / dd;
        t.y = (ze.y * (1.0 - ds) - zs2.y * (1.0 - de)) / dd;

        var P = {
            x : zo.x + t.x,
            y : zo.y + t.y
        };

        var d = {
            x : t.x,
            y : t.y
        };
        d.y = -d.y;
        HTCoordE.multiply(d, zo);
        d.x += 1;
        HTCoordE.divide(P, d);

        var O = {
            x : zo.x,
            y : -zo.y
        };

        HTCoordE.multiply(O, t);
        O.x += 1;
        HTCoordE.divide(O, d);

        var z = {
            x : oldCoordinates.x,
            y : oldCoordinates.y
        };

        var za = {
            x : z.x,
            y : z.y
        };
        HTCoordE.multiply(za, O);
        za.x += P.x;
        za.y += P.y;

        var dv = P;
        dv.y = -dv.y;
        HTCoordE.multiply(dv, z);
        HTCoordE.multiply(dv, O);
        dv.x += 1;

        HTCoordE.divide(za, dv);

        ybyra.rootNode.coordE.x = za.x;
        ybyra.rootNode.coordE.y = za.y;

    }

};
