# Redmine charts - v1.0.1 [![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/donate/?business=AAG2P7YL5VEKU&no_recurring=0&currency_code=EUR&item_name=GitHub-Redmine-Charts)

This is a plugin for [Redmine](http://www.redmine.org/).

It is a simple chart reporting plugin for Redmine. It is placed on all the issue list page that has a filter on the top. Currently there is two kind of charts available. These are displayed under the filters with a tabed are.
* Issue list statistic based on a selected field
* Open vs Closed chart. This can handle all the issue from the list (open vs closed), or only the issues were created in the given period (created vs closed).

***Issue statistics by any field***
![donut_chart](https://github.com/user-attachments/assets/a97b02b3-0df3-4daa-b942-203f1b2e693d)


***Open and Closed chart***
![closed_resolved_chart](https://github.com/user-attachments/assets/3da3889e-a5c6-412d-9144-b1f390e841b4)

This plugin is powered by:

* [chart.js](https://www.chartjs.org)

## Compatibility
This plugin was tested with `5.0.8` version of Redmine.

It is highly possible that this runs also with any 5.x and 6.x versions.
In case you checked the compatibility with any Redmine version, please let me know the result.

## Warnings

> [!IMPORTANT]
> The plugin uses API calls, so API must be activated in Redmine (see Administration/Settings/API).
> In some case, when the issue list is out of any project the browser may require further authentication.
> In this case the user must have an API access key, which will be generated automatically when user opens his "My account" page.
> When the script realizes missing API access key, then redirects the user to the "My Account" page.

## Features
* Issue statistics
  * Displays a donut chart on the issues list based on the selected fields.
  * It can handle custom fields too and displays the human readable value of these fields.
  * The script uses API calls to fetch extra data for the chart.
  * The chart area is collapsible. In this case the code does not fetch data.
  * It remembers for the "collapse", "show values" and "Group by" settings.
* Open vs Closed statistics
  *  Displays a history chart and shows the change of the numbers of the sum, open and closed issues
  *  Adjustable time period
  *  Adjustable granurality (day, week, month) 
  *  It remembers for the "from", "to", granurality and type settings.
 
## Usage
* The plugin automatically appears on issue pages just after the filters.
* It is possible to close/open the chart arrea with the > sign before the "Charts" title. It works just like the "Filters" title above.
* Available charts are on tabs. Select the tab for the chart you need.
* Change the filter settings and using "apply" will recalculate the chart automatically.
* You can change the parameters of the selected chart. 
* **Issue statistics**
  * The appearance of data above the figure can be switched on/off. Hints above any piece of the figure show the related data of the area.
  * Change the selected columns under the options and the new column will appear in the "Group by" list of the chart.
* **Open vs Closed history**
  * Select the date period and the granurality for the history chart.
  * Also select the focus of the chart (all issues from the filter, or isses created in the given period only)




## Install
```
$ cd redmine/plugins
$ git clone https://github.com/WhitehawkTailor/redmine_chart_reporting.git
$ rake redmine:plugins:migrate NAME=redmine_indicator
```
In case Redmine operates in a container ( podman, or docker) then run this (redmine is the name of the container):
```
$ podman exec -it redmine bundle exec rake redmine:plugins:assets RAILS_ENV=production
```
restart Redmine

## Uninstall
```
$ cd redmine/plugins
$ rake redmine:plugins:migrate NAME=redmine_indicator VERSION=0
```
In case Redmine operates in a container ( podman, or docker) then run this (redmine is the name of the container):
```
$ podman exec -it redmine bundle exec rake redmine:plugins:migrate NAME=redmine_indicator VERSION=0
```
restart Redmine

## Dependencies
The plugin includes chart.umd.min.js from [https://www.chartjs.org](https://www.chartjs.org).
It is a one file version of chart.js that embeds all the functions and assets that is required to draw a chart.
You can replace it to a newer version, but compatibility is not granted.
Location of the chart file: `redmine/plugins/redmine_chart_reporting/assets/javascripts/`


## Localization
The plugin initially supports two languages (English, Hungarian). The language is selected based on the parent page language settings in HTML. It is the language that the user uses in Redmine.

Localization can be extended, just add your language to the localization dictionary in the `reporting_logic.js` file.

The location of the file: `redmine/plugins/redmine_chart_reporting/assets/javascripts/`
```javascript
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
        
```

## Further development
Planned new features:
* selectable chart types
* configurable panels for Home, My Page and project summary pages.
* Standalon My Report page with multiple panels.

## Author

Ákos Szabó
