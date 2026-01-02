(function() {
    console.log("Redmine Reporting Plugin [v1.0.1] - STARTED");
    
    const lang = $('html').attr('lang') || 'en';
    const l10n = {
        hu: {
            chart_title: "Kimutatások (API alapú)",
            tab_distribution: "Megoszlás", tab_history: "Történet",
            loading: "Adatok lekérése...", grouping: "Csoportosítás:",
            show_values: "Értékek", from: "Mettől:", to: "Meddig:",
            step: "Bontás:", step_day: "Napi", step_week: "Heti", step_month: "Havi",
            open_diff: "Nyitott (különbség)", closed: "Lezárt", total_label: "Összes",
            history_main_title: "Nyitott és zárt feladatok állapota",
            scope_period_long: "periódusban létrehozott feladatok",
            scope_total_long: "minden feladat a szűrő szerint",
            auth_error: "API kulcs szükséges!", distribution_label: "szerinti megoszlás", db: "db"
        },
        en: {
            chart_title: "Charts (API based)",
            tab_distribution: "Distribution", tab_history: "History",
            loading: "Fetching data...", grouping: "Group by:",
            show_values: "Show values", from: "From:", to: "To:",
            step: "Step:", step_day: "Day", step_week: "Week", step_month: "Month",
            open_diff: "Open (Difference)", closed: "Closed", total_label: "Total",
            history_main_title: "Status of open and closed issues",
            scope_period_long: "issues created in period",
            scope_total_long: "all issues by filter",
            auth_error: "API key required!", distribution_label: "distribution", db: "pcs"
        }
    };
    const t = l10n[lang] || l10n['en'];  

    var baseUrl = (typeof Redmine !== 'undefined' && Redmine.relative_url_root) ? Redmine.relative_url_root : '';
    var myChart = null;
    var issuesCache = [];
    var metaCache = { users: {}, cf: {}, closedStatusIds: [] };
    var currentFilterUrl = "";
    var activeTab = localStorage.getItem('redmine_chart_active_tab') || 'distribution';

    function initDynamicChart() {
        if (!$('body').hasClass('action-index') || $('table.list.issues').length === 0 || $('#chart-area-container').length > 0) return;
        renderInterface();
    }

    
    async function loadMeta(apiKey) {
        try {
            const headers = { 'X-Redmine-API-Key': apiKey };
            const sRes = await $.ajax({ url: baseUrl + '/issue_statuses.json', headers }).catch(() => ({issue_statuses:[]}));
            metaCache.closedStatusIds = sRes.issue_statuses.filter(s => s.is_closed === true).map(s => s.id);
            const uRes = await $.ajax({ url: baseUrl + '/users.json?limit=1000&status=1', headers }).catch(() => ({users:[]}));
            uRes.users?.forEach(u => metaCache.users[u.id.toString()] = u.firstname + " " + u.lastname);
            const cfRes = await $.ajax({ url: baseUrl + '/custom_fields.json', headers }).catch(() => ({custom_fields:[]}));
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
        } catch (e) { console.error("Meta load error", e); }
    }

    async function loadAllDataAndRender() {
        if ($('#chart-area-container').hasClass('collapsed')) return;
        let filterUrl = window.location.search;
        if (!filterUrl || filterUrl === "" || filterUrl === "?") {
            const firstSortLink = $('table.list.issues thead th a').first().attr('href');
            if (firstSortLink && firstSortLink.includes('?')) {
                filterUrl = '?' + firstSortLink.split('?')[1];
                filterUrl = filterUrl.replace(/&?sort=[^&]*/g, '').replace(/&?direction=[^&]*/g, '');
            }
        }
        if (issuesCache.length === 0 || currentFilterUrl !== filterUrl) {
            $('#chart-loader').css('display', 'flex');
            var apiKey = localStorage.getItem('redmine_api_key_autofetch');
            if (!apiKey) {
                try {
                    var data = await $.get(baseUrl + '/my/api_key');
                    apiKey = $(data).find('#content pre').text().trim();
                    if (apiKey) localStorage.setItem('redmine_api_key_autofetch', apiKey);
                } catch(e) {}
            }
            if (!apiKey) { alert(t.auth_error); return; }
            await loadMeta(apiKey);
            var allIssues = [], offset = 0, limit = 100;
            var projectMatch = window.location.pathname.match(/\/projects\/([^\/]+)/);
            var apiPath = projectMatch ? baseUrl + '/projects/' + projectMatch[1] + '/issues.json' : baseUrl + '/issues.json';
            var conn = filterUrl.includes('?') ? '&' : '?';
            try {
                let totalCount = 0;
                do {
                    var res = await $.ajax({ url: apiPath + filterUrl + conn + 'limit=' + limit + '&offset=' + offset, headers: { 'X-Redmine-API-Key': apiKey } });
                    allIssues = allIssues.concat(res.issues);
                    totalCount = res.total_count;
                    $('#progress-text').html(`<b>${allIssues.length} / ${totalCount}</b>`);
                    offset += limit;
                } while (allIssues.length < totalCount);
                issuesCache = allIssues; currentFilterUrl = filterUrl;
            } catch (e) { $('#progress-text').text("API Error"); return; } finally { $('#chart-loader').hide(); }
        }
        if (activeTab === 'distribution') processDistribution();
        else processHistory();
    }

    function renderInterface() {
        var isCollapsed = localStorage.getItem('redmine_chart_collapsed') === 'true';
        var iconClass = isCollapsed ? 'icon-collapsed' : 'icon-expanded';
        var html = `
            <fieldset id="chart-area-container" class="collapsible ${isCollapsed ? 'collapsed' : ''}" style="margin: 10px 0;">
                <legend onclick="toggleFieldset(this); handleChartToggle();" class="icon ${iconClass}">${t.chart_title}</legend>
                <div id="chart-content" style="${isCollapsed ? 'display: none;' : ''} padding: 15px; background: #fff; border: 1px solid #ddd; border-top: none;">
                    <div class="tabs" style="margin-bottom: 15px;">
                        <ul style="display: flex; list-style: none; padding: 0; border-bottom: 1px solid #ccc; gap: 5px;">
                            <li style="margin-bottom: -1px;"><a href="#" class="tab-link" data-tab="distribution" id="tab-dist">${t.tab_distribution}</a></li>
                            <li style="margin-bottom: -1px;"><a href="#" class="tab-link" data-tab="history" id="tab-hist">${t.tab_history}</a></li>
                        </ul>
                    </div>
                    <div id="chart-loader" style="display:none; position:absolute; top:120px; left:0; width:100%; height:150px; z-index:100; background:rgba(255,255,255,0.8); justify-content: center; align-items: center;"><div id="progress-text"><b>${t.loading}</b></div></div>
                    <div id="chart-controls" style="margin-bottom: 20px; display: flex; justify-content: center; align-items: center; gap: 15px; flex-wrap: wrap; font-size: 0.9em;"></div>
                    <div id="canvas-wrapper" style="height: 380px;"><canvas id="dynamicChartCanvas"></canvas></div>
                </div>
            </fieldset>
            <style>
                .tab-link { display: block; padding: 8px 15px; border: 1px solid #ccc; text-decoration: none; border-radius: 4px 4px 0 0; }
                .tab-link.active-tab { background: #fff !important; color: #000 !important; font-weight: bold !important; border-bottom: 1px solid #fff !important; }
                .tab-link.inactive-tab { background: #eee !important; color: #888 !important; font-weight: normal !important; border-bottom: 1px solid #ccc !important; }
            </style>
        `;
        $('.autoscroll').first().before(html);
        $(document).on('click', '.tab-link', function(e) {
            e.preventDefault();
            activeTab = $(this).data('tab');
            localStorage.setItem('redmine_chart_active_tab', activeTab);
            refreshUI();
        });
        refreshUI();
    }

    function refreshUI() {
        $('.tab-link').removeClass('active-tab').addClass('inactive-tab');
        if(activeTab === 'distribution') $('#tab-dist').removeClass('inactive-tab').addClass('active-tab');
        else $('#tab-hist').removeClass('inactive-tab').addClass('active-tab');
        const ctrl = $('#chart-controls').empty();

        if (activeTab === 'distribution') {
            var showLabels = localStorage.getItem('redmine_chart_labels') !== 'false';
            var lastCol = localStorage.getItem('redmine_chart_column') || 'status';
            ctrl.append(`<label><b>${t.grouping}</b></label><select id="column-selector" style="padding: 2px;"></select>`);
            ctrl.append(`<div style="display:flex; align-items:center; gap:5px;"><input type="checkbox" id="show-values-check" ${showLabels?'checked':''}> <label for="show-values-check">${t.show_values}</label></div>`);
            $('table.list.issues thead th').each(function() {
                var cls = $(this).attr('class'); if (!cls) return;
                var tech = cls.split(' ').find(c => ['status', 'priority', 'assigned_to', 'author', 'tracker', 'category', 'fixed_version', 'project'].includes(c) || c.startsWith('cf_'));
                if (tech) $('#column-selector').append(`<option value="${tech}" ${tech===lastCol?'selected':''}>${$(this).text().trim()}</option>`);
            });
            $('#column-selector, #show-values-check').on('change', function() {
                localStorage.setItem('redmine_chart_column', $('#column-selector').val());
                localStorage.setItem('redmine_chart_labels', $('#show-values-check').is(':checked'));
                loadAllDataAndRender();
            });
        } else {
            
            const todayStr = new Date().toISOString().split('T')[0];
            const defaultPrev = new Date(); defaultPrev.setDate(defaultPrev.getDate() - 30);
            const savedFrom = localStorage.getItem('redmine_chart_hist_from') || defaultPrev.toISOString().split('T')[0];
            const savedTo = localStorage.getItem('redmine_chart_hist_to') || todayStr;
            const savedStep = localStorage.getItem('redmine_chart_hist_step') || 'week';
            const savedScope = localStorage.getItem('redmine_chart_hist_scope') || 'period';

            ctrl.append(`<label>${t.from}</label><input type="date" id="hist-from" value="${savedFrom}" style="padding:2px;">`);
            ctrl.append(`<label>${t.to}</label><input type="date" id="hist-to" value="${savedTo}" style="padding:2px;">`);
            ctrl.append(`<select id="hist-step" style="padding:2px;">
                <option value="day" ${savedStep==='day'?'selected':''}>${t.step_day}</option>
                <option value="week" ${savedStep==='week'?'selected':''}>${t.step_week}</option>
                <option value="month" ${savedStep==='month'?'selected':''}>${t.step_month}</option>
            </select>`);
            ctrl.append(`<select id="hist-scope-select" style="padding:2px; font-weight:bold; border:1px solid #2980b9;">
                <option value="period" ${savedScope==='period'?'selected':''}>${t.scope_period_long}</option>
                <option value="total" ${savedScope==='total'?'selected':''}>${t.scope_total_long}</option>
            </select>`);
            ctrl.append(`<button type="button" id="refresh-hist" class="button-small">OK</button>`);

            $('#refresh-hist, #hist-scope-select, #hist-step').on('change click', function() {
                localStorage.setItem('redmine_chart_hist_from', $('#hist-from').val());
                localStorage.setItem('redmine_chart_hist_to', $('#hist-to').val());
                localStorage.setItem('redmine_chart_hist_step', $('#hist-step').val());
                localStorage.setItem('redmine_chart_hist_scope', $('#hist-scope-select').val());
                loadAllDataAndRender();
            });
        }
        loadAllDataAndRender();
    }

    function processHistory() {
        var from = new Date($('#hist-from').val());
        var to = new Date($('#hist-to').val());
        to.setHours(23, 59, 59, 999);
        var step = $('#hist-step').val();
        var scope = $('#hist-scope-select').val();
        
        var scopeText = (scope === 'period') ? t.scope_period_long : t.scope_total_long;
        var dynamicTitle = `${t.history_main_title} (${scopeText})`;

        var labels = [], totalD = [], closedD = [], diffD = [];
        var curr = new Date(from);
        while (curr <= to) {
            var checkPoint = new Date(curr); checkPoint.setHours(23, 59, 59, 999);
            labels.push(curr.toISOString().split('T')[0]);
            var t_count = 0, c_count = 0;
            issuesCache.forEach(i => {
                var created = new Date(i.created_on);
                var isClosedStatus = i.status && metaCache.closedStatusIds.includes(i.status.id);
                var actualClosedDate = i.closed_on ? new Date(i.closed_on) : (isClosedStatus ? new Date(i.updated_on) : null);
                if (scope === 'period' && (created < from || created > to)) return;
                if (created <= checkPoint) {
                    t_count++;
                    if (actualClosedDate && actualClosedDate <= checkPoint) c_count++;
                }
            });
            totalD.push(t_count); closedD.push(c_count); diffD.push(t_count - c_count);
            if (step === 'day') curr.setDate(curr.getDate() + 1);
            else if (step === 'week') curr.setDate(curr.getDate() + 7);
            else curr.setMonth(curr.getMonth() + 1);
        }
        renderLine(labels, totalD, closedD, diffD, dynamicTitle);
    }

    function renderLine(labels, tot, cls, diff, chartTitle) {
        if (myChart) myChart.destroy();
        var ctx = document.getElementById('dynamicChartCanvas').getContext('2d');
        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: t.total_label, data: tot, borderColor: '#e74c3c', backgroundColor: '#e74c3c', fill: false, tension: 0.1, pointStyle: 'line' },
                    { label: t.closed, data: cls, borderColor: '#2ecc71', backgroundColor: '#2ecc71', fill: false, tension: 0.1, pointStyle: 'line' },
                    { label: t.open_diff, data: diff, borderColor: '#3498db', backgroundColor: '#3498db', borderDash: [5,5], fill: false, tension: 0.1, pointStyle: 'line' }
                ]
            },
            options: { 
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }, 
                plugins: { 
                    legend: { labels: { usePointStyle: true } },
                    title: { display: true, text: chartTitle, font: { size: 14, weight: 'bold' } },
                    tooltip: { mode: 'index', intersect: false } 
                } 
            }
        });
    }

    function processDistribution() {
        var field = $('#column-selector').val();
        var stats = {};
        issuesCache.forEach(issue => {
            var val = "N/A";
            if (field.startsWith('cf_')) {
                var cfId = field.replace('cf_', '');
                var cf = issue.custom_fields?.find(c => c.id.toString() === cfId);
                if (cf && cf.value) {
                    let raw = Array.isArray(cf.value) ? cf.value[0] : cf.value;
                    val = metaCache.cf[cfId]?.[raw.toString()] || metaCache.users[raw.toString()] || raw;
                }
            } else { val = (issue[field] && typeof issue[field] === 'object') ? issue[field].name : (issue[field] || "N/A"); }
            stats[val] = (stats[val] || 0) + 1;
        });
        renderPie(stats);
    }

    function renderPie(stats) {
        if (myChart) myChart.destroy();
        var ctx = document.getElementById('dynamicChartCanvas').getContext('2d');
        var showLabelsOnChart = $('#show-values-check').is(':checked');
        var total = Object.values(stats).reduce((a, b) => a + b, 0);
        var fieldLabel = $('#column-selector option:selected').text();
        myChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: Object.keys(stats), datasets: [{ data: Object.values(stats), backgroundColor: ['#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#1abc9c'] }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { generateLabels: (chart) => { const data = chart.data; return data.labels.map((label, i) => ({ text: `${label}: ${data.datasets[0].data[i]} ${t.db} (${((data.datasets[0].data[i]/total)*100).toFixed(1)}%)`, fillStyle: data.datasets[0].backgroundColor[i], index: i })); } } },
                    tooltip: { displayColors: true, callbacks: { title: () => null, label: function(context) { var val = context.parsed; var perc = ((val / total) * 100).toFixed(1); return [" " + context.label, " " + val + " " + t.db, " " + perc + "%"]; } } },
                    title: { display: true, text: `${fieldLabel} ${t.distribution_label} (${total} ${t.db})`, font: { size: 14 } }
                }
            },
            plugins: [{ id: 'customLabels', afterDraw: (chart) => { if (!showLabelsOnChart) return; const { ctx, data } = chart; ctx.save(); chart.getDatasetMeta(0).data.forEach((datapoint, index) => { const { x, y } = datapoint.tooltipPosition(); const val = data.datasets[0].data[index]; if ((val / total) > 0.03) { ctx.fillStyle = '#000'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.fillText(val + ' ' + t.db, x, y - 7); ctx.fillText(((val/total)*100).toFixed(1) + '%', x, y + 7); } }); ctx.restore(); } }]
        });
    }

    window.handleChartToggle = function() {
        setTimeout(() => {
            var collapsed = $('#chart-area-container').hasClass('collapsed');
            localStorage.setItem('redmine_chart_collapsed', collapsed);
            if (!collapsed) loadAllDataAndRender();
        }, 50);
    };

    $(document).ready(initDynamicChart);
    $(document).ajaxComplete(initDynamicChart);
})();
