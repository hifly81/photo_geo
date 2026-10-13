'use client';

import { useEffect, useState } from 'react';
import { HomePage } from '@/components/home-page';
import { IntegrationsPanel } from '@/components/integrations-panel';
import { FilesystemSyncPanel } from '@/components/filesystem-sync-panel';

type SettingsSection = 'home' | 'providers' | 'filesystem-sync';

type TagOption = {
    id: string;
    name: string;
};

type DateTreeMonth = {
    month: string;
    count: number;
};

type DateTreeYear = {
    year: string;
    count: number;
    months: DateTreeMonth[];
};

type DateTreeResponse = {
    years: DateTreeYear[];
    noDateCount: number;
};

type LocationTreeCity = {
    city: string;
    count: number;
};

type LocationTreeCountry = {
    country: string | null;
    count: number;
    cities: LocationTreeCity[];
};

type LocationTreeResponse = {
    countries: LocationTreeCountry[];
};

export type SelectedDateFilter =
    | { mode: 'all' }
    | { mode: 'year'; year: string }
    | { mode: 'month'; year: string; month: string }
    | { mode: 'no-date' };

export type SelectedLocationFilter =
    | { mode: 'all' }
    | { mode: 'country'; country: string | null }
    | { mode: 'city'; country: string | null; city: string };

export function SettingsShell() {
    const [activeSection, setActiveSection] = useState<SettingsSection>('home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isTagsOpen, setIsTagsOpen] = useState(true);
    const [isDateOpen, setIsDateOpen] = useState(true);
    const [isLocationOpen, setIsLocationOpen] = useState(true);
    const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [dateTree, setDateTree] = useState<DateTreeResponse>({ years: [], noDateCount: 0 });
    const [locationTree, setLocationTree] = useState<LocationTreeResponse>({ countries: [] });
    const [expandedYears, setExpandedYears] = useState<string[]>([]);
    const [expandedCountries, setExpandedCountries] = useState<string[]>([]);
    const [selectedDateFilter, setSelectedDateFilter] = useState<SelectedDateFilter>({ mode: 'all' });
    const [selectedLocationFilter, setSelectedLocationFilter] = useState<SelectedLocationFilter>({ mode: 'all' });

    useEffect(() => {
        async function loadTags() {
            try {
                const response = await fetch('/api/tags');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error ?? 'Failed to load tags');
                }

                setAvailableTags(data.tags ?? []);
            } catch (error) {
                console.error(error);
            }
        }

        void loadTags();
    }, []);

    useEffect(() => {
        async function loadDates() {
            try {
                const params = new URLSearchParams();

                if (selectedTags.length > 0) {
                    params.set('tags', selectedTags.join(','));
                }

                const query = params.toString();
                const response = await fetch(query ? `/api/dates?${query}` : '/api/dates');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error ?? 'Failed to load dates');
                }

                setDateTree({
                    years: data.years ?? [],
                    noDateCount: data.noDateCount ?? 0
                });
            } catch (error) {
                console.error(error);
            }
        }

        void loadDates();
    }, [selectedTags]);

    useEffect(() => {
        async function loadLocations() {
            try {
                const params = new URLSearchParams();

                if (selectedTags.length > 0) {
                    params.set('tags', selectedTags.join(','));
                }

                const query = params.toString();
                const response = await fetch(query ? `/api/locations?${query}` : '/api/locations');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error ?? 'Failed to load locations');
                }

                setLocationTree({
                    countries: data.countries ?? []
                });
            } catch (error) {
                console.error(error);
            }
        }

        void loadLocations();
    }, [selectedTags]);

    useEffect(() => {
        if (!isSidebarOpen) {
            setIsTagsOpen(false);
            setIsDateOpen(false);
            setIsLocationOpen(false);
            setExpandedYears([]);
            setExpandedCountries([]);
        }
    }, [isSidebarOpen]);

    function toggleTag(tagName: string) {
        setSelectedTags((current) =>
            current.includes(tagName)
                ? current.filter((tag) => tag !== tagName)
                : [...current, tagName]
        );
        setActiveSection('home');
    }

    function clearTags() {
        setSelectedTags([]);
        setActiveSection('home');
    }

    function toggleYearExpanded(year: string) {
        setExpandedYears((current) =>
            current.includes(year)
                ? current.filter((item) => item !== year)
                : [...current, year]
        );
    }

    function selectAllDates() {
        setSelectedDateFilter({ mode: 'all' });
        setActiveSection('home');
    }

    function selectYear(year: string) {
        setSelectedDateFilter({ mode: 'year', year });
        setActiveSection('home');
    }

    function selectMonth(year: string, month: string) {
        setSelectedDateFilter({ mode: 'month', year, month });
        setActiveSection('home');
    }

    function selectNoDate() {
        setSelectedDateFilter({ mode: 'no-date' });
        setActiveSection('home');
    }

    function toggleCountryExpanded(countryKey: string) {
        setExpandedCountries((current) =>
            current.includes(countryKey)
                ? current.filter((item) => item !== countryKey)
                : [...current, countryKey]
        );
    }

    function selectAllLocations() {
        setSelectedLocationFilter({ mode: 'all' });
        setActiveSection('home');
    }

    function selectCountry(country: string | null) {
        setSelectedLocationFilter({ mode: 'country', country });
        const countryKey = country ?? '__NO_COUNTRY__';
        setExpandedCountries((current) => (current.includes(countryKey) ? current : [...current, countryKey]));
        setActiveSection('home');
    }

    function selectCity(country: string | null, city: string) {
        setSelectedLocationFilter({ mode: 'city', country, city });
        const countryKey = country ?? '__NO_COUNTRY__';
        setExpandedCountries((current) => (current.includes(countryKey) ? current : [...current, countryKey]));
        setActiveSection('home');
    }

    function isYearSelected(year: string) {
        return selectedDateFilter.mode === 'year' && selectedDateFilter.year === year;
    }

    function isMonthSelected(year: string, month: string) {
        return (
            selectedDateFilter.mode === 'month' &&
            selectedDateFilter.year === year &&
            selectedDateFilter.month === month
        );
    }

    function isCountrySelected(country: string | null) {
        return selectedLocationFilter.mode === 'country' && selectedLocationFilter.country === country;
    }

    function isCitySelected(country: string | null, city: string) {
        return (
            selectedLocationFilter.mode === 'city' &&
            selectedLocationFilter.country === country &&
            selectedLocationFilter.city === city
        );
    }

    function formatMonth(month: string) {
        const names: Record<string, string> = {
            '01': 'January',
            '02': 'February',
            '03': 'March',
            '04': 'April',
            '05': 'May',
            '06': 'June',
            '07': 'July',
            '08': 'August',
            '09': 'September',
            '10': 'October',
            '11': 'November',
            '12': 'December'
        };

        return names[month] ?? month;
    }

    const countTextStyle = {
        flexShrink: 0,
        color: '#1f2937',
        fontWeight: 600
    } as const;

    const navButtonStyle = (selected: boolean) =>
        ({
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isSidebarOpen ? 'flex-start' : 'center',
            gap: 10,
            padding: isSidebarOpen ? '10px 12px' : '10px 8px',
            borderRadius: 10,
            border: selected ? '1px solid #2563eb' : '1px solid #d0d5dd',
            background: selected ? '#eff6ff' : '#f8fafc',
            color: selected ? '#1d4ed8' : '#0f172a',
            fontSize: 14,
            fontWeight: 600,
            textAlign: 'left',
            boxShadow: selected
                ? '0 0 0 1px rgba(37, 99, 235, 0.08)'
                : '0 1px 2px rgba(15, 23, 42, 0.04)'
        }) as const;

    const collapsedIconButtonStyle = (active = false) =>
        ({
            width: '100%',
            minHeight: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 8px',
            borderRadius: 10,
            border: active ? '1px solid #2563eb' : '1px solid #d0d5dd',
            background: active ? '#eff6ff' : '#f8fafc',
            color: active ? '#1d4ed8' : '#0f172a',
            boxShadow: active
                ? '0 0 0 1px rgba(37, 99, 235, 0.08)'
                : '0 1px 2px rgba(15, 23, 42, 0.04)'
        }) as const;

    const accordionHeaderStyle = {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid #d0d5dd',
        background: '#f8fafc',
        color: '#0f172a',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 700,
        textAlign: 'left',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
    } as const;

    const iconStyle = {
        width: 18,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: 'inherit',
        fontSize: 14,
        lineHeight: 1
    } as const;

    const accordionChevronBaseStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 18,
        height: 18,
        flexShrink: 0,
        color: '#475467',
        fontSize: 12,
        lineHeight: 1,
        transition: 'transform 0.18s ease'
    } as const;

    return (
        <section
            style={{
                display: 'grid',
                gridTemplateColumns: isSidebarOpen ? '240px minmax(0, 1fr)' : '72px minmax(0, 1fr)',
                gap: 16,
                alignItems: 'start'
            }}
        >
            <aside
                className="card"
                style={{
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    position: 'sticky',
                    top: 16,
                    maxHeight: 'calc(100vh - 32px)',
                    overflowY: 'auto'
                }}
            >
                <div
                    className="row"
                    style={{
                        justifyContent: isSidebarOpen ? 'space-between' : 'center',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'nowrap'
                    }}
                >
                    {isSidebarOpen ? <strong>Menu</strong> : null}

                    <button
                        type="button"
                        className="secondary"
                        onClick={() => setIsSidebarOpen((current) => !current)}
                        aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                        title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        {isSidebarOpen ? '←' : '→'}
                    </button>
                </div>

                <nav className="stack" style={{ gap: 8 }}>
                    <button
                        type="button"
                        onClick={() => setActiveSection('home')}
                        style={navButtonStyle(activeSection === 'home')}
                        title="Home"
                    >
            <span aria-hidden="true" style={iconStyle}>
              {isSidebarOpen ? '⌂' : 'H'}
            </span>
                        {isSidebarOpen ? <span>Home</span> : null}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('providers')}
                        style={navButtonStyle(activeSection === 'providers')}
                        title="Providers"
                    >
            <span aria-hidden="true" style={iconStyle}>
              {isSidebarOpen ? '◎' : 'P'}
            </span>
                        {isSidebarOpen ? <span>Providers</span> : null}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('filesystem-sync')}
                        style={navButtonStyle(activeSection === 'filesystem-sync')}
                        title="Filesystem sync"
                    >
            <span aria-hidden="true" style={iconStyle}>
              {isSidebarOpen ? '⇄' : 'F'}
            </span>
                        {isSidebarOpen ? <span>Filesystem sync</span> : null}
                    </button>
                </nav>

                {activeSection === 'home' ? (
                    <>
                        {isSidebarOpen ? (
                            <div className="stack" style={{ gap: 10 }}>
                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => setIsTagsOpen((current) => !current)}
                                    aria-expanded={isTagsOpen}
                                    aria-label={isTagsOpen ? 'Collapse Tags section' : 'Expand Tags section'}
                                    style={accordionHeaderStyle}
                                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span aria-hidden="true" style={iconStyle}>
                      #
                    </span>
                    <span>Tags</span>
                  </span>
                                    <span
                                        aria-hidden="true"
                                        style={{
                                            ...accordionChevronBaseStyle,
                                            transform: isTagsOpen ? 'rotate(90deg)' : 'rotate(0deg)'
                                        }}
                                    >
                    ›
                  </span>
                                </button>

                                {isTagsOpen ? (
                                    <div className="stack" style={{ gap: 8, paddingLeft: 4 }}>
                                        <button
                                            type="button"
                                            className={selectedTags.length === 0 ? '' : 'secondary'}
                                            onClick={clearTags}
                                            style={{
                                                textAlign: 'left',
                                                justifyContent: 'flex-start',
                                                width: '100%',
                                                padding: '8px 10px',
                                                fontSize: 14
                                            }}
                                        >
                                            All tags
                                        </button>

                                        {availableTags.map((tag) => {
                                            const selected = selectedTags.includes(tag.name);

                                            return (
                                                <button
                                                    key={tag.id}
                                                    type="button"
                                                    className={selected ? '' : 'secondary'}
                                                    onClick={() => toggleTag(tag.name)}
                                                    style={{
                                                        textAlign: 'left',
                                                        justifyContent: 'flex-start',
                                                        width: '100%',
                                                        padding: '8px 10px',
                                                        fontSize: 14,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}
                                                    title={tag.name}
                                                >
                                                    {selected ? '✓ ' : ''}
                                                    {tag.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : null}

                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => setIsDateOpen((current) => !current)}
                                    aria-expanded={isDateOpen}
                                    aria-label={isDateOpen ? 'Collapse Date section' : 'Expand Date section'}
                                    style={accordionHeaderStyle}
                                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span aria-hidden="true" style={iconStyle}>
                      ◷
                    </span>
                    <span>Date</span>
                  </span>
                                    <span
                                        aria-hidden="true"
                                        style={{
                                            ...accordionChevronBaseStyle,
                                            transform: isDateOpen ? 'rotate(90deg)' : 'rotate(0deg)'
                                        }}
                                    >
                    ›
                  </span>
                                </button>

                                {isDateOpen ? (
                                    <div className="stack" style={{ gap: 8, paddingLeft: 4 }}>
                                        <button
                                            type="button"
                                            className={selectedDateFilter.mode === 'all' ? '' : 'secondary'}
                                            onClick={selectAllDates}
                                            style={{
                                                textAlign: 'left',
                                                justifyContent: 'flex-start',
                                                width: '100%',
                                                padding: '8px 10px',
                                                fontSize: 14
                                            }}
                                        >
                                            All dates
                                        </button>

                                        {dateTree.years.map((item) => {
                                            const expanded = expandedYears.includes(item.year);
                                            const selected = isYearSelected(item.year);

                                            return (
                                                <div key={item.year} className="stack" style={{ gap: 4 }}>
                                                    <div
                                                        style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: '28px minmax(0, 1fr)',
                                                            gap: 6,
                                                            alignItems: 'stretch'
                                                        }}
                                                    >
                                                        <button
                                                            type="button"
                                                            className="secondary"
                                                            onClick={() => toggleYearExpanded(item.year)}
                                                            aria-label={expanded ? `Collapse ${item.year}` : `Expand ${item.year}`}
                                                            title={expanded ? `Collapse ${item.year}` : `Expand ${item.year}`}
                                                            style={{
                                                                padding: 0,
                                                                minWidth: 28,
                                                                width: 28,
                                                                height: 36,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 700,
                                                                lineHeight: 1
                                                            }}
                                                        >
                                                            {expanded ? '−' : '+'}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className={selected ? '' : 'secondary'}
                                                            onClick={() => selectYear(item.year)}
                                                            style={{
                                                                textAlign: 'left',
                                                                justifyContent: 'space-between',
                                                                width: '100%',
                                                                padding: '8px 10px',
                                                                fontSize: 14,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 8
                                                            }}
                                                            title={item.year}
                                                        >
                              <span
                                  style={{
                                      minWidth: 0,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                  }}
                              >
                                {selected ? '✓ ' : ''}
                                  {item.year}
                              </span>
                                                            <span className="small" style={countTextStyle}>
                                {item.count}
                              </span>
                                                        </button>
                                                    </div>

                                                    {expanded ? (
                                                        <div className="stack" style={{ gap: 4, paddingLeft: 34 }}>
                                                            {item.months.map((month) => {
                                                                const monthSelected = isMonthSelected(item.year, month.month);

                                                                return (
                                                                    <button
                                                                        key={`${item.year}-${month.month}`}
                                                                        type="button"
                                                                        className={monthSelected ? '' : 'secondary'}
                                                                        onClick={() => selectMonth(item.year, month.month)}
                                                                        style={{
                                                                            textAlign: 'left',
                                                                            justifyContent: 'space-between',
                                                                            width: '100%',
                                                                            padding: '8px 10px',
                                                                            fontSize: 14,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: 8
                                                                        }}
                                                                        title={`${item.year}-${month.month}`}
                                                                    >
                                    <span
                                        style={{
                                            minWidth: 0,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                      {monthSelected ? '✓ ' : ''}
                                        {formatMonth(month.month)}
                                    </span>
                                                                        <span className="small" style={countTextStyle}>
                                      {month.count}
                                    </span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}

                                        <button
                                            type="button"
                                            className={selectedDateFilter.mode === 'no-date' ? '' : 'secondary'}
                                            onClick={selectNoDate}
                                            style={{
                                                textAlign: 'left',
                                                justifyContent: 'space-between',
                                                width: '100%',
                                                padding: '8px 10px',
                                                fontSize: 14,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8
                                            }}
                                        >
                      <span>
                        {selectedDateFilter.mode === 'no-date' ? '✓ ' : ''}
                          No date
                      </span>
                                            <span className="small" style={countTextStyle}>
                        {dateTree.noDateCount}
                      </span>
                                        </button>
                                    </div>
                                ) : null}

                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => setIsLocationOpen((current) => !current)}
                                    aria-expanded={isLocationOpen}
                                    aria-label={isLocationOpen ? 'Collapse By location section' : 'Expand By location section'}
                                    style={accordionHeaderStyle}
                                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span aria-hidden="true" style={iconStyle}>
                      ⌖
                    </span>
                    <span>By location</span>
                  </span>
                                    <span
                                        aria-hidden="true"
                                        style={{
                                            ...accordionChevronBaseStyle,
                                            transform: isLocationOpen ? 'rotate(90deg)' : 'rotate(0deg)'
                                        }}
                                    >
                    ›
                  </span>
                                </button>

                                {isLocationOpen ? (
                                    <div className="stack" style={{ gap: 8, paddingLeft: 4 }}>
                                        <button
                                            type="button"
                                            className={selectedLocationFilter.mode === 'all' ? '' : 'secondary'}
                                            onClick={selectAllLocations}
                                            style={{
                                                textAlign: 'left',
                                                justifyContent: 'flex-start',
                                                width: '100%',
                                                padding: '8px 10px',
                                                fontSize: 14
                                            }}
                                        >
                                            All locations
                                        </button>

                                        {locationTree.countries.map((item) => {
                                            const countryKey = item.country ?? '__NO_COUNTRY__';
                                            const countryLabel = item.country ?? 'No country';
                                            const expanded = expandedCountries.includes(countryKey);
                                            const selected = isCountrySelected(item.country);

                                            return (
                                                <div key={countryKey} className="stack" style={{ gap: 4 }}>
                                                    <div
                                                        style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: '28px minmax(0, 1fr)',
                                                            gap: 6,
                                                            alignItems: 'stretch'
                                                        }}
                                                    >
                                                        <button
                                                            type="button"
                                                            className="secondary"
                                                            onClick={() => toggleCountryExpanded(countryKey)}
                                                            aria-label={expanded ? `Collapse ${countryLabel}` : `Expand ${countryLabel}`}
                                                            title={expanded ? `Collapse ${countryLabel}` : `Expand ${countryLabel}`}
                                                            style={{
                                                                padding: 0,
                                                                minWidth: 28,
                                                                width: 28,
                                                                height: 36,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 700,
                                                                lineHeight: 1
                                                            }}
                                                        >
                                                            {expanded ? '−' : '+'}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className={selected ? '' : 'secondary'}
                                                            onClick={() => selectCountry(item.country)}
                                                            style={{
                                                                textAlign: 'left',
                                                                justifyContent: 'space-between',
                                                                width: '100%',
                                                                padding: '8px 10px',
                                                                fontSize: 14,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 8
                                                            }}
                                                            title={countryLabel}
                                                        >
                              <span
                                  style={{
                                      minWidth: 0,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                  }}
                              >
                                {selected ? '✓ ' : ''}
                                  {countryLabel}
                              </span>
                                                            <span className="small" style={countTextStyle}>
                                {item.count}
                              </span>
                                                        </button>
                                                    </div>

                                                    {expanded ? (
                                                        <div className="stack" style={{ gap: 4, paddingLeft: 34 }}>
                                                            {item.cities.map((city) => {
                                                                const citySelected = isCitySelected(item.country, city.city);

                                                                return (
                                                                    <button
                                                                        key={`${countryKey}-${city.city}`}
                                                                        type="button"
                                                                        className={citySelected ? '' : 'secondary'}
                                                                        onClick={() => selectCity(item.country, city.city)}
                                                                        style={{
                                                                            textAlign: 'left',
                                                                            justifyContent: 'space-between',
                                                                            width: '100%',
                                                                            padding: '8px 10px',
                                                                            fontSize: 14,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: 8
                                                                        }}
                                                                        title={`${countryLabel} - ${city.city}`}
                                                                    >
                                    <span
                                        style={{
                                            minWidth: 0,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                      {citySelected ? '✓ ' : ''}
                                        {city.city}
                                    </span>
                                                                        <span className="small" style={countTextStyle}>
                                      {city.count}
                                    </span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <div className="stack" style={{ gap: 8 }}>
                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => setActiveSection('home')}
                                    title="Tags"
                                    aria-label="Tags"
                                    style={collapsedIconButtonStyle(selectedTags.length > 0)}
                                >
                                    <span aria-hidden="true" style={iconStyle}>#</span>
                                </button>

                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => setActiveSection('home')}
                                    title="Date"
                                    aria-label="Date"
                                    style={collapsedIconButtonStyle(selectedDateFilter.mode !== 'all')}
                                >
                                    <span aria-hidden="true" style={iconStyle}>◷</span>
                                </button>

                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => setActiveSection('home')}
                                    title="By location"
                                    aria-label="By location"
                                    style={collapsedIconButtonStyle(selectedLocationFilter.mode !== 'all')}
                                >
                                    <span aria-hidden="true" style={iconStyle}>⌖</span>
                                </button>
                            </div>
                        )}
                    </>
                ) : null}
            </aside>

            <div style={{ minWidth: 0 }}>
                {activeSection === 'home' ? (
                    <HomePage
                        selectedTags={selectedTags}
                        selectedDateFilter={selectedDateFilter}
                        selectedLocationFilter={selectedLocationFilter}
                    />
                ) : null}
                {activeSection === 'providers' ? <IntegrationsPanel /> : null}
                {activeSection === 'filesystem-sync' ? <FilesystemSyncPanel /> : null}
            </div>
        </section>
    );
}