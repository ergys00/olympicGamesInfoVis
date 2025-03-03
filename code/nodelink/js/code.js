/*
            Tooltip
      */
const tooltip = d3.select(".tooltip");

function showTooltip(event, d) {
  const { gold, silver, bronze, total } = d.medals;
  tooltip
    .style("display", "block")
    .style("left", `${event.pageX + 10}px`)
    .style("top", `${event.pageY + 10}px`).html(`
            <strong>${d.name || d.id}</strong><br>
            <strong>Medals:</strong><br>
            Total: ${total}<br>
            Gold: ${gold}<br>
            Silver: ${silver}<br>
            Bronze: ${bronze}
          `);
}

function showLinkTooltip(event, d, originalLinks) {
  const originalLink = originalLinks.find((link) => link.source === d.source.id && link.target === d.target.id);

  if (!originalLink?.attr) return;

  const medals = {
    gold: 0,
    silver: 0,
    bronze: 0,
    total: originalLink.attr.length,
  };

  originalLink.attr.forEach((attr) => {
    if (attr.medal) {
      medals[attr.medal.toLowerCase()]++;
    }
  });

  tooltip
    .style("display", "block")
    .style("left", `${event.pageX + 10}px`)
    .style("top", `${event.pageY + 10}px`).html(`
            <strong>Link: </strong>
            ${d.target.name || d.target.id} ➜ ${d.source.name || d.source.id}<br>
            <strong>Medals:</strong><br>
            Total: ${medals.total}<br>
            Gold: ${medals.gold}<br>
            Silver: ${medals.silver}<br>
            Bronze: ${medals.bronze}
          `);
}

function hideTooltip() {
  tooltip.style("display", "none");
}

/*
            Highlight
      */
function resetHighlight(node, link, label) {
  node.classed("node-highlight", false).classed("node-faded", false);
  link.classed("link-highlight", false).classed("link-faded", false);
  label.classed("label-highlight", false).classed("label-faded", false);
}

function highlightNodeConnections(d, node, link, label) {
  const connectedNodeIds = new Set();
  const connectedLinks = new Set();

  link.each(function (l) {
    if (l.source.id === d.id || l.target.id === d.id) {
      connectedNodeIds.add(l.source.id);
      connectedNodeIds.add(l.target.id);
      connectedLinks.add(this);
    }
  });

  node.each(function (n) {
    if (connectedNodeIds.has(n.id)) {
      d3.select(this).classed("node-highlight", true).classed("node-faded", false);
    } else if (n.id !== d.id) {
      d3.select(this).classed("node-faded", true);
    }
  });

  label.each(function (n) {
    if (connectedNodeIds.has(n.id)) {
      d3.select(this).classed("label-highlight", true).classed("label-faded", false);
    } else if (n.id !== d.id) {
      d3.select(this).classed("label-faded", true);
    }
  });

  link.each(function (l) {
    if (connectedLinks.has(this)) {
      d3.select(this).classed("link-highlight", true).classed("link-faded", false);
    } else {
      d3.select(this).classed("link-faded", true);
    }
  });
}

function highlightLinkConnections(d, node, link, label) {
  node.each(function (n) {
    if (n.id === d.source.id || n.id === d.target.id) {
      d3.select(this).classed("node-highlight", true).classed("node-faded", false);
    } else {
      d3.select(this).classed("node-faded", true);
    }
  });

  label.each(function (n) {
    if (n.id === d.source.id || n.id === d.target.id) {
      d3.select(this).classed("label-highlight", true).classed("label-faded", false);
    } else {
      d3.select(this).classed("label-faded", true);
    }
  });

  link.each(function (l) {
    if (l === d) {
      d3.select(this).classed("link-highlight", true).classed("link-faded", false);
    } else {
      d3.select(this).classed("link-faded", true);
    }
  });
}

function highlightRegion(region, node, link, label) {
  const relatedNodeIds = new Set();

  node.each(function (n) {
    if (n.region === region || n.region === "Sport") {
      relatedNodeIds.add(n.id);
      d3.select(this).classed("node-highlight", true).classed("node-faded", false);
    } else {
      d3.select(this).classed("node-faded", true);
    }
  });

  label.each(function (n) {
    if (relatedNodeIds.has(n.id)) {
      d3.select(this).classed("label-highlight", true).classed("label-faded", false);
    } else {
      d3.select(this).classed("label-faded", true);
    }
  });

  link.each(function (l) {
    if ((relatedNodeIds.has(l.source.id) && relatedNodeIds.has(l.target.id)) || (relatedNodeIds.has(l.target.id) && relatedNodeIds.has(l.source.id))) {
      d3.select(this).classed("link-highlight", true).classed("link-faded", false);
    } else {
      d3.select(this).classed("link-faded", true);
    }
  });
}

/*
            Drag
      */
function createDragBehavior(simulation) {
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.2).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
}

/*
            DrawGraph
      */
function drawGraph(dataset) {
  const svg = d3.select(".graph");
  const width = svg.node().getBoundingClientRect().width;
  const height = svg.node().getBoundingClientRect().height;
  svg.selectAll("*").remove();
  const g = svg.append("g");

  const nodes = dataset.nodes;
  const links = dataset.links;

  // Calcolo medaglie
  const medalCountryCounts = {};
  const medalSportCounts = {};

  links.forEach((link) => {
    link.attr.forEach((attr) => {
      if (!attr.medal) return;
      const medalType = attr.medal.toLowerCase();

      if (!medalCountryCounts[link.target]) {
        medalCountryCounts[link.target] = { gold: 0, silver: 0, bronze: 0, total: 0 };
      }
      medalCountryCounts[link.target][medalType]++;
      medalCountryCounts[link.target].total++;

      if (!medalSportCounts[link.source]) {
        medalSportCounts[link.source] = { gold: 0, silver: 0, bronze: 0, total: 0 };
      }
      medalSportCounts[link.source][medalType]++;
      medalSportCounts[link.source].total++;
    });
  });

  const nodesWithMedals = nodes.map((node) => ({
    ...node,
    medals: node.noc ? medalCountryCounts[node.id] || { gold: 0, silver: 0, bronze: 0, total: 0 } : medalSportCounts[node.id] || { gold: 0, silver: 0, bronze: 0, total: 0 },
  }));

  const linksWithValues = links.map((link) => ({
    source: link.source,
    target: link.target,
    value: link.attr ? link.attr.length : 1,
  }));

  const maxMedals = Math.max(...nodesWithMedals.map((d) => d.medals.total));
  const maxLinkValue = Math.max(...linksWithValues.map((d) => d.value));
  const nodeScale = d3.scaleSqrt().domain([1, maxMedals]).range([10, 40]);
  const linkScale = d3.scaleSqrt().domain([1, maxLinkValue]).range([3, 15]);

  /*
            Force Simulation
        */
  const simulation = d3
    .forceSimulation(nodesWithMedals)
    .force(
      "link",
      d3
        .forceLink(linksWithValues)
        .id((d) => d.id)
        .distance((link) => {
          const targetSize = nodeScale(link.target.medals.total || 1);
          return 70 + targetSize * 2;
        })
    )
    .force(
      "charge",
      d3.forceManyBody().strength((d) => -320 - d.medals.total * 5)
    )
    .force("center", d3.forceCenter(width / 2 + 50, height / 2))
    .force(
      "collision",
      d3
        .forceCollide()
        .radius((d) => nodeScale(d.medals.total || 1) + 5)
        .strength(0.8)
    )
    .force("x", d3.forceX(width / 2).strength(0.6))
    .force("y", d3.forceY(height / 2).strength(0.6));

  /*
            Elementi grafici
        */
  const link = g
    .append("g")
    .selectAll("line")
    .data(linksWithValues)
    .join("line")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.8)
    .attr("stroke-width", (d) => linkScale(d.value))
    .on("mouseover", (event, d) => {
      showLinkTooltip(event, d, dataset.links);
      highlightLinkConnections(d, node, link, label);
    })
    .on("mouseout", () => {
      hideTooltip();
      resetHighlight(node, link, label);
    })
    .style("cursor", "pointer");

  const node = g
    .append("g")
    .selectAll("circle")
    .data(nodesWithMedals)
    .join("circle")
    .attr("stroke", (d) => {
      if (d.region === "Sport") return "#e74c3c";
      const colors = {
        Africa: "#2ecc71",
        "Asia & Oceania": "#e67e22",
        Europe: "#3498db",
        Americas: "#9966cb",
      };
      return colors[d.region] || "#95a5a6";
    })
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 5)
    .attr("r", (d) => nodeScale(d.medals.total || 1))
    .attr("fill", (d) => {
      if (d.region === "Sport") return "#e74c3c";
      const colors = {
        Africa: "#2ecc71",
        "Asia & Oceania": "#e67e22",
        Europe: "#3498db",
        Americas: "#9966cb",
      };
      return colors[d.region] || "#95a5a6";
    })
    .on("mouseover", (event, d) => {
      showTooltip(event, d);
      highlightNodeConnections(d, node, link, label);
    })
    .on("mouseout", () => {
      hideTooltip();
      resetHighlight(node, link, label);
    })
    .call(createDragBehavior(simulation));

  const label = g
    .append("g")
    .selectAll("text")
    .data(nodesWithMedals)
    .join("text")
    .text((d) => d.name || d.id)
    .attr("font-size", "10px")
    .attr("dx", (d) => nodeScale(d.medals.total || 1) + 3)
    .attr("dy", 4);

  /*
            Legenda
        */
  const legendItems = document.querySelectorAll(".legend-item");
  legendItems.forEach((item) => {
    item.addEventListener("mouseenter", () => {
      const region = item.getAttribute("data-region");
      highlightRegion(region, node, link, label);
    });

    item.addEventListener("mouseleave", () => {
      resetHighlight(node, link, label);
    });
  });

  /*
            Zoom
        */
  const zoom = d3
    .zoom()
    .scaleExtent([0.5, 4])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

  svg.call(zoom);
  svg.call(zoom.transform, d3.zoomIdentity.scale(0.7).translate(width / 4 - 70, height / 4 - 70));

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

    label.attr("x", (d) => d.x).attr("y", (d) => d.y);
  });
}

d3.json("../../data/dataset.json")
  .then(drawGraph)
  .catch((error) => {
    console.error("Error loading the dataset:", error);
  });
