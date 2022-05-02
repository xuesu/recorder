function normalStringToElementP(str) {
	return "<p>" + String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').split("\n").join("</p><p>") + "</p>";
}

Element.prototype.getElementById = function (id) {
	return this.querySelector("#" + id);
}

Element.prototype.getElementsByName = function (name) {
	return this.querySelectorAll("[name=\"" + name + "\"]");
}

function showElementById(elementID) {
	document.getElementById(elementID).setAttribute("style", "visibility: visible;")
}

function hideElementById(elementID) {
	document.getElementById(elementID).setAttribute("style", "visibility: hidden;")
}

function getASTD3TreeNodeName(ast3) {
	if (ast3.name.length < 10) {
		return ast3.name;
	}
	return ast3.id;
}


function clear_all_info_tr(table_ele) {
	for (var i = table_ele.getElementsByTagName("tr").length - 1; i >= 0; i--) {
		table_ele.deleteRow(i);
	}
}

function add_info_tr(name, value, table_ele) {
	var text_value = value;
	if (name.endsWith("_timestamp")) {
		var date_tmp = new Date(value * 1000);
		text_value = date_tmp.toLocaleString();
	}
	if (table_ele.getElementsByName(name).length > 0) {
		var row = table_ele.getElementsByName(name)[0];
		var cells = row.getElementsByTagName("td");
		cells[0].innerHTML = normalStringToElementP(name);
		cells[1].innerHTML = normalStringToElementP(text_value);
	} else {
		var row = table_ele.insertRow();
		row.setAttribute("name", name);
		var cell1 = row.insertCell(0);
		var cell2 = row.insertCell(1);
		cell1.innerHTML = normalStringToElementP(name);
		cell2.innerHTML = normalStringToElementP(text_value);
	}
}

function show_diff_time(x) {
	var x = Math.floor(x / 1000);
	var hour = Math.floor(x / 3600);
	var min = Math.floor((x % 3600) / 60);
	var sec = Math.floor((x % 3600) % 60);
	return hour + " hour " + min + " min " + sec + " sec";
}

function get_max_deep(funcNode) {
	var ans = 1;
	for (var i = 0; i < funcNode.children.length; i += 1) {
		var child_max_deep = get_max_deep(funcNode.children[i]);
		if (child_max_deep + 1 > ans) {
			ans = child_max_deep + 1;
		}
	}
	return ans;
}

function display_block_details(data) {
	var table_ele = document.getElementById("table_node_details");
	clear_all_info_tr(table_ele);
	for (var attr in data) {
		add_info_tr(attr, data[attr], table_ele);
	}
}

function draw_collapse_tree(max_deep, data, margin = {
	top: 50,
	right: 40,
	bottom: 50,
	left: 200
}, dx = 60, dy = 300) {
	var width = max_deep * dy + margin.left + margin.right;
	const root = d3.hierarchy(data);
	const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x);
	var tree = d3.tree().nodeSize([dx, dy]);

	root.x0 = dy / 2;
	root.y0 = 0;
	root.descendants().forEach((d, i) => {
		d.id = i;
		d._children = d.children;
		d._radius = 30.0;
		if (d.data.status == "failed") {
			d._color0 = '#FE8176';
		} else if (d.data.status == "waiting") {
			d._color0 = '#00BFFF';
		} else if (d.data.status == "done") {
			d._color0 = '#66B032';
		} else {
			d._color0 = '#6395F2';
		}
		d.name = d.data.text.substr(0, 20) + "\n" + parseFloat(d.data.process).toFixed(2) + "%";
	});


	const svg = d3.create("svg")
		.attr("viewBox", [-margin.left, -margin.top, width, dx])
		.style("font", "20px sans-serif")
		.style("user-select", "none");

	const gLink = svg.append("g")
		.attr("fill", "none")
		.attr("stroke", "#008080")
		.attr("stroke-opacity", 0.4)
		.attr("stroke-width", 1.5);

	const gNode = svg.append("g")
		.attr("cursor", "pointer")
		.attr("pointer-events", "all");

	function update(source) {
		const duration = d3.event && d3.event.altKey ? 2500 : 250;
		const nodes = root.descendants().reverse();
		const links = root.links();

		// Compute the new tree layout.
		tree(root);

		let left = root;
		let right = root;
		root.eachBefore(node => {
			if (node.x < left.x) left = node;
			if (node.x > right.x) right = node;
		});

		const height = right.x - left.x + margin.top + margin.bottom;

		const transition = svg.transition()
			.duration(duration)
			.attr("viewBox", [-margin.left, left.x - margin.top, width, height])
			.tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

		// Update the nodes…
		const node = gNode.selectAll("g")
			.data(nodes, d => d.id);

		// Enter any new nodes at the parent's previous position.
		const nodeEnter = node.enter().append("g")
			.attr("transform", d => `translate(${source.y0},${source.x0})`)
			.attr("fill-opacity", 0)
			.attr("stroke-opacity", 0)
			.on("click", (event, d) => {
				d.children = d.children ? null : d._children;
				update(d);
				display_block_details(d.data);
			});

		nodeEnter.append("circle")
			.attr("r", d => d._radius)
			.attr("stroke", d => d._color0)
			.attr("fill", d => d._children ? d._color0 : "transparent")
			.attr("stroke-width", 3);

		nodeEnter.append("text")
			.attr("dy", "0.31em")
			.attr("x", d => d._children ? -6 : 6)
			.attr("text-anchor", d => d._children ? "end" : "start")
			.text(d => d.name)
			.clone(true).lower()
			.attr("stroke-linejoin", "round")
			.attr("stroke-width", 3)
			.attr("stroke", "white");

		// Transition nodes to their new position.
		const nodeUpdate = node.merge(nodeEnter).transition(transition)
			.attr("transform", d => `translate(${d.y},${d.x})`)
			.attr("fill-opacity", 1)
			.attr("stroke-opacity", 1);

		// Transition exiting nodes to the parent's new position.
		const nodeExit = node.exit().transition(transition).remove()
			.attr("transform", d => `translate(${source.y},${source.x})`)
			.attr("fill-opacity", 0)
			.attr("stroke-opacity", 0);

		// Update the links…
		const link = gLink.selectAll("path")
			.data(links, d => d.target.id);

		// Enter any new links at the parent's previous position.
		const linkEnter = link.enter().append("path")
			.attr("d", d => {
				const o = {
					x: source.x0,
					y: source.y0
				};
				return diagonal({
					source: o,
					target: o
				});
			});

		// Transition links to their new position.
		link.merge(linkEnter).transition(transition)
			.attr("d", diagonal);

		// Transition exiting nodes to the parent's new position.
		link.exit().transition(transition).remove()
			.attr("d", d => {
				const o = {
					x: source.x,
					y: source.y
				};
				return diagonal({
					source: o,
					target: o
				});
			});

		// Stash the old positions for transition.
		root.eachBefore(d => {
			d.x0 = d.x;
			d.y0 = d.y;
		});
	}

	update(root);

	return svg.node();
}

function displaySimpleTrees(treeinfos, canvas_element, min_h = 700) {
	if (treeinfos == undefined || treeinfos.error != undefined) {
		alert("cannot refresh get_tree_simple!");
		return;
	}
	while (canvas_element.hasChildNodes()) canvas_element.removeChild(canvas_element.childNodes[0]);
	var overall_height = 0;
	for (var i = 0; i < treeinfos.length; i += 1) {
		var root = treeinfos[i];
		var max_deep = get_max_deep(root);
		var svg_element = draw_collapse_tree(max_deep, root);
		var layer_width = 300;
		var wrapper_element = document.createElement("div");
		svg_element.setAttribute("style", "width: " + (layer_width + 1) * max_deep + "px");
		wrapper_element.classList.add('proj_todo_tree_canvas_container');
		var current_h = (root.children.length + 1) * 60;
		if (treeinfos.length == 1) {
			current_h = min_h;
		}
		wrapper_element.setAttribute("style", "height: " + current_h + "px");
		overall_height += current_h;
		wrapper_element.appendChild(svg_element);
		canvas_element.appendChild(wrapper_element);
	}
	canvas_element.setAttribute("style", "height: " + overall_height + "px")
}
