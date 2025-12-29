# Redmine charts
## Summary
It is a simple chart reporting plugin for Redmine to visualize the statistics of an issue list by displaying a donnut chart based on any selected field of the isseu list.
## Usage
The plugin automatically appears on issue pages just after the filters.

It is possible to close/open it with the > sign before the "Charts" title.

It works just like the "Filters" title above.

You can change the column parameter (Group by) for the chart. 

![redmine_chart_reporting_02](https://github.com/user-attachments/assets/c5df10c8-8937-41a0-be10-6bc7eae46cd7)

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

## Localization
The plugin initially supports two languages only (English, Hungarian), but it can be easily extended.

Add your language to the localization dictionaryin the reporting_logic.js file.

The location is: redmine/plugins/redmine_chart_reporting/assets/javascripts/
```
const l10n = {
        hu: {
            chart_title: "Kimutatások (API alapú)",
            loading: "Adatok lekérése az API-n keresztül...",
            auth: "Hitelesítés folyamatban...",
            grouping: "Csoportosítás:",
            show_values: "Értékek mutatása",
            auth_error: "A kimutatásokhoz API kulcs szükséges. Kérlek, generáld le a 'Saját fiókom' oldalon a 'Megjelenítés' linkre kattintva!",
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
            grouping: "Group by:",
            show_values: "Show values",
            auth_error: "API key required. Please generate it on 'My account' page by clicking 'Show'!",
            api_error: "Error fetching data (Status: ",
            no_data: "No data to display (0/0)",
            total_tasks: "tasks",
            distribution: "distribution",
            db: "pcs"
        }
    };
```
