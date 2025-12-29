(function() {
    console.log("Redmine Chart Reporting Plugin [v1.0.0]: https://github.com/WhitehawkTailor/redmine_chart_reporting - STARTED");
    
    //Localization - Extend the I10n array with your language
    const lang = $('html').attr('lang') || 'en';
    const l10n = {
        hu: {
            chart_title: "Kimutatások (API alapú)",
            loading: "Adatok lekérése az API-n keresztül...",
            auth: "Hitelesítés folyamatban...",
            meta: "Metaadatok feloldása...",
            grouping: "Csoportosítás:",
            show_values: "Értékek mutatása",
            auth_error: "A kimutatásokhoz API kulcs szükséges. Kérlek, generáld le a 'Saját fiókom' oldalon!",
            api_error: "Hiba az adatok lekérésekor (Status: ",
            no_data: "Nincs megjeleníthető adat (0/0)",
            total_tasks: "feladat",
            distribution: "szerinti megoszlás",
            db: "db"
        },
        en: {
            chart_title: "Charts (API based)",
            loading: "Fetching data via API...",
            auth: "Authenticating...",
            meta: "Resolving metadata...",
            grouping: "Group by:",
            show_values: "Show values",
            auth_error: "API key required. Please generate it on 'My account' page!",
            api_error: "Error fetching data (Status: ",
            no_data: "No data to display (0/0)",
            total_tasks: "tasks",
            distribution: "distribution",
            db: "pcs"
        }
    };
    const t = l10n[lang] || l10n['en'];  
    
    var baseUrl = (typeof Redmine !== 'undefined' && Redmine.relative_url_root) ? Redmine.relative_url_root : '';
    var chartJsUrl = baseUrl + '/plugin_assets/redmine_chart_reporting/javascripts/chart.umd.min.js';
    
    // CACHE
    var myChart = null;
    var issuesCache = [];
    var metaCache = { users: {}, cf: {}, versions: {} };
    var currentFilterUrl = "";

    var showLabelsOnChart = localStorage.getItem('redmine_chart_labels') === null ? true : localStorage.getItem('redmine_chart_labels') === 'true';
    var isCollapsed = localStorage.getItem('redmine_chart_collapsed') === null ? true : localStorage.getItem('redmine_chart_collapsed') === 'true';
    var lastSelectedColumn = localStorage.getItem('redmine_chart_column') || 'status';

    function initDynamicChart() {
        if (!$('body').hasClass('action-index') || $('table.list.issues').length === 0 || $('#chart-area-container').length > 0) return;
        
        if (typeof Chart === 'undefined') {
            var script = document.createElement('script');
            script.src = chartJsUrl;
            script.onload = renderInterface;
            document.head.appendChild(script);
        } else {
            renderInterface();
        }
    }

    async function loadMeta(apiKey) {
        try {
            $('#progress-text').text(t.meta);
            const headers = { 'X-Redmine-API-Key': apiKey };
            
            // Felhasználók lekérése
            const uRes = await $.ajax({ url: baseUrl + '/users.json?limit=1000&status=1', headers }).catch(e => { console.warn("User API missing"); return {users:[]}; });
            uRes.users?.forEach(u => metaCache.users[u.id.toString()] = u.firstname + " " + u.lastname);

            // Custom Field definíciók lekérése
            const cfRes = await $.ajax({ url: baseUrl + '/custom_fields.json', headers }).catch(e => { console.warn("CF API missing"); return {custom_fields:[]}; });
            cfRes.custom_fields?.forEach(cf => {
                if (cf.possible_values) {
                    metaCache.cf[cf.id.toString()] = {};
                    cf.possible_values.forEach(pv => {
                        let val = typeof pv === 'object' ? pv.value : pv;
                        let lbl = typeof pv === 'object' ? pv.label : pv;
                        metaCache.cf[cf.id.toString()][val.toString()] = lbl;
                    });
                }
            });

            // Verziók lekérése - Ha a sima /versions.json nem megy, a projekt-specifikusat vagy a shared-et használjuk
            // Ha épp egy projektben vagyunk, próbáljuk meg annak a verzióit
            var projectMatch = window.location.pathname.match(/\/projects\/([^\/]+)/);
            var vUrl = projectMatch ? baseUrl + '/projects/' + projectMatch[1] + '/versions.json' : null;
            
            if (vUrl) {
                const vRes = await $.ajax({ url: vUrl, headers }).catch(e => { return {versions:[]}; });
                vRes.versions?.forEach(v => metaCache.versions[v.id.toString()] = v.name);
            }

        } catch (e) { console.error("Meta load error", e); }
    }
 
 
 
 
    function renderInterface() {
        var columns = [];
        $('table.list.issues thead th').each(function() {
            var th = $(this);
            var classes = th.attr('class');
            if (!classes) return;
            var techName = classes.split(' ').find(c => 
                ['status', 'priority', 'assigned_to', 'author', 'tracker', 'category', 'fixed_version', 'project'].includes(c) || c.startsWith('cf_')
            );
            if (techName) {
                columns.push({ tech: techName, label: th.text().trim() });
            }
        });

        var iconClass = isCollapsed ? 'icon-collapsed' : 'icon-expanded';
        var html = `
            <fieldset id="chart-area-container" class="collapsible ${isCollapsed ? 'collapsed' : ''}" style="margin: 10px 0;">
                <legend onclick="toggleFieldset(this); handleChartToggle();" class="icon ${iconClass}">${t.chart_title}</legend>
                <div id="chart-content" style="${isCollapsed ? 'display: none;' : ''} padding: 15px; background: #fff; position: relative; border: 1px solid #ddd; border-top: none;">
                    <div id="chart-loader" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; z-index:100; background:rgba(255,255,255,0.8); display: flex; justify-content: center; align-items: center; flex-direction: column;">
                        <div style="margin-bottom: 10px;"><b>${t.loading}</b></div>
                        <div id="progress-text">0 / 0</div>
                    </div>
                    <div style="margin-bottom: 20px; text-align: center; display: flex; justify-content: center; align-items: center; gap: 20px;">
                        <div>
                            <label style="font-weight: bold; margin-right: 10px;">${t.grouping}</label>
                            <select id="column-selector" style="padding: 4px 8px;"></select>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <input type="checkbox" id="show-values-check" ${showLabelsOnChart ? 'checked' : ''}>
                            <label for="show-values-check" style="font-size: 13px;">${t.show_values}</label>
                        </div>
                    </div>
                    <div id="canvas-wrapper" style="height: 350px;">
                        <canvas id="dynamicPieChart"></canvas>
                    </div>
                </div>
            </fieldset>
        `;
        $('.autoscroll').first().before(html);

        var selector = $('#column-selector');
        columns.forEach(col => {
            var selected = (col.tech === lastSelectedColumn) ? 'selected' : '';
            selector.append(`<option value="${col.tech}" ${selected}>${col.label}</option>`);
        });

        selector.on('change', function() {
            localStorage.setItem('redmine_chart_column', selector.val());
            loadAllDataAndRender();
        });

        $('#show-values-check').on('change', function() {
            showLabelsOnChart = $(this).is(':checked');
            localStorage.setItem('redmine_chart_labels', showLabelsOnChart);
            loadAllDataAndRender();
        });

        if (!isCollapsed) loadAllDataAndRender();
    }

    window.handleChartToggle = function() {
        setTimeout(function() {
            var container = $('#chart-area-container');
            var nowCollapsed = container.hasClass('collapsed');
            localStorage.setItem('redmine_chart_collapsed', nowCollapsed);
            if (!nowCollapsed) loadAllDataAndRender();
        }, 50);
    };

    async function getOrFetchApiKey() {
        var storedKey = localStorage.getItem('redmine_api_key_autofetch');
        if (storedKey) return storedKey;
        try {
            var data = await $.get(baseUrl + '/my/api_key');
            var key = $(data).find('#content pre').text().trim();
            if (key && key.length > 20) {
                localStorage.setItem('redmine_api_key_autofetch', key);
                return key;
            }
        } catch (e) { console.error("Key fetch error", e); }
        return null;
    }

    async function loadAllDataAndRender() {
        var techField = $('#column-selector').val();
        var fieldLabel = $('#column-selector option:selected').text();
        let filterUrl = window.location.search;
        
        // Csak akkor töltünk az API-ról, ha a szűrő változott vagy üres a cache
        if (issuesCache.length === 0 || currentFilterUrl !== filterUrl) {
            $('#chart-loader').css('display', 'flex');
            $('#progress-text').text(t.auth);
            
            var apiKey = await getOrFetchApiKey();
            if (!apiKey) {
                alert(t.auth_error);
                window.location.href = baseUrl + '/my/account';
                return;
            }

            await loadMeta(apiKey);

            var allIssues = [];
            var offset = 0, limit = 100, totalCount = 0;
            var projectMatch = window.location.pathname.match(/\/projects\/([^\/]+)/);
            var apiPath = projectMatch ? baseUrl + '/projects/' + projectMatch[1] + '/issues.json' : baseUrl + '/issues.json';
            // set the connector
       		var connector = filterUrl.includes('?') ? '&' : '?';

			// filter
			if (!filterUrl.includes('set_filter=1')) {
				filterUrl += connector + 'set_filter=1';
				connector = '&'; // A következő paraméter már biztosan &-el jön
			}


            try {
                do {
                    var finalApiUrl = apiPath + filterUrl + connector + 'limit=' + limit + '&offset=' + offset + '&include=custom_fields';
                    var response = await $.ajax({
                        url: finalApiUrl,
                        method: 'GET',
                        headers: { 'X-Redmine-API-Key': apiKey }
                    });
                    
                    if (response.issues) {
                        allIssues = allIssues.concat(response.issues);
                        totalCount = response.total_count;
                        $('#progress-text').text(allIssues.length + " / " + totalCount);
                    } else break;
                    offset += limit;
                } while (allIssues.length < totalCount);

                issuesCache = allIssues;
                currentFilterUrl = filterUrl;
            } catch (error) {
                $('#progress-text').text(t.api_error + error.status + ")");
                return;
            } finally {
                setTimeout(() => { $('#chart-loader').hide(); }, 300);
            }
        }

        if (issuesCache.length > 0) processAndRender(issuesCache, techField, fieldLabel);
        else $('#progress-text').text(t.no_data);
    }

    function processAndRender(issues, field, label) {
        var stats = {};
        issues.forEach(issue => {
            var val = "N/A";
            if (field.startsWith('cf_')) {
                var cfId = field.replace('cf_', '');
                var cf = issue.custom_fields ? issue.custom_fields.find(c => c.id.toString() === cfId) : null;
                if (cf && cf.value) {
                    let raw = Array.isArray(cf.value) ? cf.value[0] : cf.value;
                    let sRaw = raw.toString();
                    val = (metaCache.cf[cfId] && metaCache.cf[cfId][sRaw]) || metaCache.users[sRaw] || metaCache.versions[sRaw] || raw;
                }
            } else {
                if (issue[field] && typeof issue[field] === 'object') {
                    val = issue[field].name;
                } else if (issue[field]) {
                    val = issue[field];
                }
            }
            stats[val] = (stats[val] || 0) + 1;
        });
        renderChart(stats, label, issues.length);
    }

    function renderChart(stats, label, total) {
        if (myChart) myChart.destroy();
        var palette = ['#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#1abc9c', '#34495e', '#7f8c8d'];
        var ctx = document.getElementById('dynamicPieChart');
        if (!ctx) return;

        myChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(stats),
                datasets: [{
                    data: Object.values(stats),
                    backgroundColor: Object.keys(stats).map((_, i) => palette[i % palette.length]),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'right',
                        labels: {
                            generateLabels: function(chart) {
                                const data = chart.data;
                                return data.labels.map((label, i) => ({
                                    text: `${label}: ${data.datasets[0].data[i]} ${t.db} (${((data.datasets[0].data[i]/total)*100).toFixed(1)}%)`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    index: i
                                }));
                            }
                        }
                    },
                    title: { display: true, text: `>${label}< ${t.distribution} (${total} ${t.total_tasks})`, font: { size: 16 } }
                }
            },
            plugins: [{
                id: 'customLabels',
                afterDraw: (chart) => {
                    if (!showLabelsOnChart) return;
                    const { ctx, data } = chart;
                    ctx.save();
                    chart.getDatasetMeta(0).data.forEach((datapoint, index) => {
                        const { x, y } = datapoint.tooltipPosition();
                        const val = data.datasets[0].data[index];
                        if ((val / total) > 0.03) {
                            ctx.fillStyle = '#000'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
                            ctx.fillText(val + ' ' + t.db, x, y - 7);
                            ctx.fillText(((val/total)*100).toFixed(1) + '%', x, y + 7);
                        }
                    });
                    ctx.restore();
                }
            }]
        });
    }

    $(document).ready(initDynamicChart);
    $(document).ajaxComplete(initDynamicChart);
})();
