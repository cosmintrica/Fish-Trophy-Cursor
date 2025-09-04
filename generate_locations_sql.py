#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pentru a genera SQL pentru toate locațiile de pescuit
"""

import json
import re
import sys
import os

# Setează encoding-ul pentru output
sys.stdout.reconfigure(encoding='utf-8')

# Datele locațiilor (prima parte)
locations_data = [
  {
    "name": "Acumulare Agrement",
    "subtitle": "Lac în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Acumulare Bacău II",
    "subtitle": "Lac în județul Bacău",
    "administrare": "Administrat de Centrul Regional de Ecologie Bacău"
  },
  {
    "name": "Acumulare Berești",
    "subtitle": "Lac în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Acumulare Canciu",
    "subtitle": "Lac în județul Alba",
    "administrare": "Administrat de Direcția Silvică Alba"
  },
  {
    "name": "Acumulare Căpâlna",
    "subtitle": "Lac în județul Alba",
    "administrare": "Administrat de Direcția Silvică Alba"
  },
  {
    "name": "Acumulare Galbeni",
    "subtitle": "Lac în județul Bacău",
    "administrare": "Administrat de Centrul Regional de Ecologie Bacău"
  },
  {
    "name": "Acumulare Gârleni",
    "subtitle": "Lac în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Acumulare Lilieci",
    "subtitle": "Lac în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Acumulare Mihoesti",
    "subtitle": "Lac în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Acumulare Petrești",
    "subtitle": "Lac în județul Alba",
    "administrare": "Administrat de Direcția Silvică Alba"
  },
  {
    "name": "Acumulare Răcăciuni",
    "subtitle": "Lac în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Acumularea Băbeni",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Acumularea Cornetu",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Acumularea Curtești (Rai)",
    "subtitle": "Lac în județul Botoșani",
    "administrare": "Administrat de ANPA - Ape Necontractate"
  },
  {
    "name": "Acumularea Câineni",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Acumularea Călimănești cu bălțile adiacente",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Acumularea Cătămărăști- Baraj Sitna",
    "subtitle": "Botoșani, Botoșani",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Acumularea Drăgășani",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Acumularea Dăești cu bălțile adiacente",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Acumularea Govora",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Acumularea Gura Lotrului cu balta adiacenta Proieni",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Acumularea Ionești",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Acumularea Negreni",
    "subtitle": "Lac în județul Botoșani",
    "administrare": "Administrat de ANPA - Ape Necontractate"
  },
  {
    "name": "Acumularea Robești",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Acumularea Râmnicu Vâlcea",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Acumularea Râureni",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Acumularea Satchinez",
    "subtitle": "Lac în județul Timiș",
    "administrare": "Administrat de ANPA - Ape Necontractate"
  },
  {
    "name": "Acumularea Surduc",
    "subtitle": "Lac în județul Timiș",
    "administrare": "Administrat de ANPA - Ape Necontractate"
  },
  {
    "name": "Acumularea Turnu",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Acumularea Zăvideni",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Addams Fishing & Camping",
    "subtitle": "Valter Maracineanu, Iepurești, Giurgiu",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Ana",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Balindru",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de Direcția Silvică Vâlcea"
  },
  {
    "name": "Balindru",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de Direcția Silvică Vâlcea"
  },
  {
    "name": "Balota",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de Direcția Silvică Vâlcea"
  },
  {
    "name": "Balta 1 - Pescaria Radesti",
    "subtitle": "Rădești, Alba",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta 2- Pescaria Radesti",
    "subtitle": "Rădești, Alba",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Adjudu Vechi",
    "subtitle": "Adjudu Vechi, Vrancea",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Babaroaga",
    "subtitle": "Mozăceni, Argeș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Balc Teleorman",
    "subtitle": "Moșteni, Teleorman",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Baraj Solești",
    "subtitle": "Solești, Vaslui",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Bitina",
    "subtitle": "Bițina-Ungureni, Ialomița",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Boldești Grădiștea",
    "subtitle": "Boldești, Prahova",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Bunget 1",
    "subtitle": "Văcărești, Dâmbovița",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Bunget 2",
    "subtitle": "Văcărești, Dâmbovița",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Buzoești",
    "subtitle": "Buzoești, Argeș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Bărbuceanu Șerifu",
    "subtitle": "Bărbuceanu, Dâmbovița",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Carol",
    "subtitle": "Săcălaz, Timiș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Cheresig",
    "subtitle": "Toboliu, Bihor",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Chita 3",
    "subtitle": "Răsuceni, Giurgiu",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Cicir",
    "subtitle": "Lac în județul Arad",
    "administrare": "Administrat de AJVPS ARAD"
  },
  {
    "name": "Balta Ciocarlia 4",
    "subtitle": "Ciocârlia, Ialomița",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Clinceni",
    "subtitle": "Clinceni, Ilfov",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Cocorenilor",
    "subtitle": "Cocoreni, Gorj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Colceag 2",
    "subtitle": "Movilița, Ialomița",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Colceag 3",
    "subtitle": "Movilița, Ialomița",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Colonești",
    "subtitle": "Colonești, Olt",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Contesti",
    "subtitle": "Cornățelu, Dâmbovița",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Corni",
    "subtitle": "Corni, Galați",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Cosmești",
    "subtitle": "Cosmești, Teleorman",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Cristian",
    "subtitle": "Cristian, Brașov",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Călăreți",
    "subtitle": "Sărulești-Sat, Călărași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Căpâlnaș",
    "subtitle": "Lac în județul Arad",
    "administrare": "Administrat de ANPA - Ape Necontractate"
  },
  {
    "name": "Balta EYA",
    "subtitle": "Găești, Dâmbovița",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Floarea Popeștiului",
    "subtitle": "Popești-Leordeni, Ilfov",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Frăsinet",
    "subtitle": "Dobrosloveni, Olt",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Ghenci",
    "subtitle": "Ghenci, Satu Mare",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Ghilin I",
    "subtitle": "Lac în județul Arad",
    "administrare": "Administrat de AJVPS ARAD"
  },
  {
    "name": "Balta Ghilin II",
    "subtitle": "Lac în județul Arad",
    "administrare": "Administrat de AJVPS ARAD"
  },
  {
    "name": "Balta Green Paradise 1",
    "subtitle": "Mehedinţa, Prahova",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Green Paradise 2",
    "subtitle": "Mehedinţa, Prahova",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Gruiu",
    "subtitle": "Gruiu, Călărași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Ileana Razoare",
    "subtitle": "Ileana, Călărași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta La Firel",
    "subtitle": "Odăeni, Argeș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta lui Otto",
    "subtitle": "Uriu, Bistrița-Năsăud",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Lunca Mihăilești",
    "subtitle": "Colţăneni, Buzău",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Maioru",
    "subtitle": "Belciugatele, Călărași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Mare Căteasca",
    "subtitle": "Leordeni, Argeș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Mircea",
    "subtitle": "Remetea Chioarului, Maramureș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Moara Vlăsiei 1",
    "subtitle": "Moara Vlăsiei, Ilfov",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Moara Vlăsiei 2",
    "subtitle": "Moara Vlăsiei, Ilfov",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Măgura 9",
    "subtitle": "Căscioarele, Călărași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Mălina",
    "subtitle": "Smardan, Galați",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Nadăș",
    "subtitle": "Nadăș, Arad",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Nicula",
    "subtitle": "Stefanesti, Călărași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Paradisul Verde",
    "subtitle": "Iepureni, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Parepa 1",
    "subtitle": "Parepa-Rușani, Prahova",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Pescuit Șindrilița",
    "subtitle": "Șindrilița, Ilfov",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Piteasca 3",
    "subtitle": "Brănești, Ilfov",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Plină",
    "subtitle": "Movilița, Ialomița",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Porumbeşti",
    "subtitle": "Porumbești, Satu Mare",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Pădureni Sud",
    "subtitle": "Pădureni, Vrancea",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Sacoșu Turcesc - Balta 2",
    "subtitle": "Sacoșu Turcesc, Timiș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Sinești 1",
    "subtitle": "Sinești, Ialomița",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Solacolu",
    "subtitle": "Sat Solacolu, Călărași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Sâncraiu",
    "subtitle": "Sâncraiu, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Sărată",
    "subtitle": "Balta Sărată, Teleorman",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Sărături",
    "subtitle": "Drăgoești, Ialomița",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Teslui",
    "subtitle": "Teslui, Dolj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Trofee Păușești",
    "subtitle": "Păușești, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Valea Ciorii",
    "subtitle": "Tartaria, Alba",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Valea Cireșului",
    "subtitle": "Valea Cireșului, Teleorman",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Valea Dragnei",
    "subtitle": "Chiriacu, Giurgiu",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Valea Liliecilor",
    "subtitle": "Siliștea, Teleorman",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Valea Mare",
    "subtitle": "Valea Mare, Covasna",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Vie - Movilita",
    "subtitle": "Movilița, Ialomița",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Vitan 3",
    "subtitle": "Popești-Leordeni, Ilfov",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Zau",
    "subtitle": "Zau de Câmpie, Mureș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Ziduri",
    "subtitle": "Ziduri, Buzău",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Balta Zătun",
    "subtitle": "Galați, Galați",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Baraj Pușcași",
    "subtitle": "Pușcași, Vaslui",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Bazinul Piscicol Creata 3",
    "subtitle": "Vânători, Ilfov",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Bistra Aurie II",
    "subtitle": "Râu în județul Suceava",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Blejesti-Sericu",
    "subtitle": "Sericu, Teleorman",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Bodi",
    "subtitle": "Lac în județul Maramureș",
    "administrare": "Administrat de Direcția Silvica Maramureș"
  },
  {
    "name": "Breazova",
    "subtitle": "Lac în județul Caraș-Severin",
    "administrare": "Administrat de Direcția Silvică Caraș-Severin"
  },
  {
    "name": "Brădișor",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de Direcția Silvică Vâlcea"
  },
  {
    "name": "Bucura",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Buhui",
    "subtitle": "Lac în județul Caraș-Severin",
    "administrare": "Administrat de Direcția Silvică Caraș-Severin"
  },
  {
    "name": "Bâlea",
    "subtitle": "Lac în județul Sibiu",
    "administrare": "Administrat de Direcția Silvică Sibiu"
  },
  {
    "name": "Cabana Pescarului JIM",
    "subtitle": "Cuptoare, Caraș-Severin",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Canalul colector Criș",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Canalul Morilor",
    "subtitle": "Râu în județul Arad",
    "administrare": "Administrat de AJVPS ARAD"
  },
  {
    "name": "Carp Arena Cărpănoaia 2",
    "subtitle": "Nănești, Vrancea",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Carpodrom Transilvania",
    "subtitle": "Toldal, Mureș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Cele Două Lacuri",
    "subtitle": "Reghin, Mureș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Chita Lake",
    "subtitle": "Răsuceni, Giurgiu",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Clubul de pescuit sportiv Năvodul Star",
    "subtitle": "Răchiți, Botoșani",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Complex LFG Poenari",
    "subtitle": "Poenari, Giurgiu",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Complex Turistic Rusciori",
    "subtitle": "Rusciori, Olt",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Conacul Lacurilor",
    "subtitle": "Mehadia, Caraș-Severin",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Crișul Repede Mijlociu",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Crișul Repede Superior",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Cuiejdel",
    "subtitle": "Lac în județul Neamț",
    "administrare": "Administrat de Direcția Silvică Neamț"
  },
  {
    "name": "Culișer",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Custura Mare",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Custura Mică",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Cândeasca Lakes Bazinul 0",
    "subtitle": "Belciugatele, Călărași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Cândeasca Lakes Bazinul 1",
    "subtitle": "Belciugatele, Călărași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Cândeasca Lakes Bazinul 3",
    "subtitle": "Belciugatele, Călărași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Cârja Conac",
    "subtitle": "Murgeni, Vaslui",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Delta Gruiului",
    "subtitle": "Budești, Călărași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Domeniul ValDan",
    "subtitle": "Peciu Nou, Timiș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Dopca",
    "subtitle": "Râu în județul Brașov",
    "administrare": "Administrat de AJPS Brașov"
  },
  {
    "name": "Dyno Lake",
    "subtitle": "Pasărea, Călărași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Dărvăstău",
    "subtitle": "Cojocna, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Ecotam Lake",
    "subtitle": "Tărtăria, Alba",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "EVELIN Lake",
    "subtitle": "Orlat, Sibiu",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Farlow Pike Arena",
    "subtitle": "Găești, Dâmbovița",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Ferma de Crap",
    "subtitle": "Diosig, Bihor",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Ferma Piscicola Podisului",
    "subtitle": "Bălțați, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Ferma Piscicolă Sovârca",
    "subtitle": "Oancea, Galați",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Firiza",
    "subtitle": "Lac în județul Maramureș",
    "administrare": "Administrat de Direcția Silvica Maramureș"
  },
  {
    "name": "Fish Zone Coaș",
    "subtitle": "Coaș, Maramureș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Florica",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Galbenu",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de Direcția Silvică Vâlcea"
  },
  {
    "name": "Galeşul",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Ghereşul",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Ghimpele (Peleguţa)",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Gold Fish",
    "subtitle": "Cuzdrioara, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Gozna",
    "subtitle": "Lac în județul Caraș-Severin",
    "administrare": "Administrat de Direcția Silvică Caraș-Severin"
  },
  {
    "name": "Gura Apei",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Gârla Huțani",
    "subtitle": "Râu în județul Botoșani",
    "administrare": "Administrat de AJVPS BOTOȘANI"
  },
  {
    "name": "Hanul Pescarilor Garofița",
    "subtitle": "Sâncraiu de Mureș, Mureș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iaz Butea",
    "subtitle": "Miclăușeni, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iaz Căbănuțele Pescarilor",
    "subtitle": "Chilișoaia, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iaz Ruginoasa",
    "subtitle": "Ruginoasa, Neamț",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iaz Totoești",
    "subtitle": "Totoești, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iazul Aladdin",
    "subtitle": "Șindrilița, Ilfov",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iazul Botez",
    "subtitle": "Mihail Kogalniceanu, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iazul Brehuiești",
    "subtitle": "Brehuiești, Botoșani",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iazul Codreni",
    "subtitle": "Codreni, Botoșani",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iazul Dumești",
    "subtitle": "Dumești, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iazul Frasin",
    "subtitle": "Probota, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iazul Ivascoaia",
    "subtitle": "Flămânzi, Botoșani",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iazul La Doi Peri",
    "subtitle": "Vișan, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iazul Loești",
    "subtitle": "Cucorăni, Botoșani",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iazul lui Dumnezeu - Mihaila",
    "subtitle": "Probota, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iazul Luizoaia",
    "subtitle": "Botoșani, Botoșani",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iazul Poseidon",
    "subtitle": "Strunga, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iazul Suharău",
    "subtitle": "Suharău, Botoșani",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iazul Tăutești",
    "subtitle": "Tăutești, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Iezer",
    "subtitle": "Lac în județul Harghita",
    "administrare": "Administrat de Direcția Silvică Harghita"
  },
  {
    "name": "Iezer – Ighel",
    "subtitle": "Lac în județul Alba",
    "administrare": "Administrat de Direcția Silvică Alba"
  },
  {
    "name": "Iezer – Șurianu",
    "subtitle": "Lac în județul Alba",
    "administrare": "Administrat de Direcția Silvică Alba"
  },
  {
    "name": "Iezerul Bistriței",
    "subtitle": "Lac în județul Maramureș",
    "administrare": "Administrat de Direcția Silvica Maramureș"
  },
  {
    "name": "Iezerul Pietrosu",
    "subtitle": "Lac în județul Maramureș",
    "administrare": "Administrat de Direcția Silvica Maramureș"
  },
  {
    "name": "Izvoare – conf. pârâul Bumbului",
    "subtitle": "Râu în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Jelna",
    "subtitle": "Râu în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "King Lake",
    "subtitle": "Ciocârlia, Ialomița",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "La 3 lacuri",
    "subtitle": "Luna, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "La Fântâna cu Cumpănă",
    "subtitle": "Brastavățu, Olt",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "La Găvrila",
    "subtitle": "Beliș, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "La Lac Maleia",
    "subtitle": "Petrila, Hunedoara",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "La Timbuș",
    "subtitle": "Găbud, Alba",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac acumulare Arcești cu  bălțile adiacente",
    "subtitle": "Lac în județul Olt",
    "administrare": "Administrat de AJVPS OLT"
  },
  {
    "name": "Lac acumulare Arpașu",
    "subtitle": "Lac în județul Sibiu",
    "administrare": "Administrat de AJVPS SIBIU"
  },
  {
    "name": "Lac acumulare Avrig",
    "subtitle": "Lac în județul Sibiu",
    "administrare": "Administrat de AJVPS SIBIU"
  },
  {
    "name": "Lac acumulare Bascov",
    "subtitle": "Lac în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Lac acumulare Bezid",
    "subtitle": "Lac în județul Mureș",
    "administrare": "Administrat de AJVPS MUREȘ"
  },
  {
    "name": "Lac acumulare Budeasa",
    "subtitle": "Lac în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Lac acumulare Cerbureni",
    "subtitle": "Lac în județul Argeș",
    "administrare": "Administrat de ANPA - Ape Necontractate"
  },
  {
    "name": "Lac acumulare Curtea de Argeș",
    "subtitle": "Lac în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Lac acumulare Drăgănești cu bălțile adiacente",
    "subtitle": "Lac în județul Olt",
    "administrare": "Administrat de AJVPS OLT"
  },
  {
    "name": "Lac acumulare Frunzaru",
    "subtitle": "Lac în județul Olt",
    "administrare": "Administrat de AJVPS OLT"
  },
  {
    "name": "Lac acumulare Golești",
    "subtitle": "Lac în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Lac acumulare Ipotești cu bălțile adiacente",
    "subtitle": "Lac în județul Olt",
    "administrare": "Administrat de AJVPS OLT"
  },
  {
    "name": "Lac acumulare Izbiceni",
    "subtitle": "Lac în județul Olt",
    "administrare": "Administrat de AJVPS OLT"
  },
  {
    "name": "Lac acumulare Olteț",
    "subtitle": "Lac în județul Brașov",
    "administrare": "Administrat de AVPS FĂGĂRAȘ"
  },
  {
    "name": "Lac acumulare Pecineagu",
    "subtitle": "Lac în județul Argeș",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Lac acumulare Pitești",
    "subtitle": "Lac în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Lac acumulare Racovița",
    "subtitle": "Lac în județul Sibiu",
    "administrare": "Administrat de AJVPS SIBIU"
  },
  {
    "name": "Lac acumulare Rusănești cu bălțile adiacente",
    "subtitle": "Lac în județul Olt",
    "administrare": "Administrat de AJVPS OLT"
  },
  {
    "name": "Lac acumulare Râușor",
    "subtitle": "Lac în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Lac acumulare Scoreiu",
    "subtitle": "Lac în județul Sibiu",
    "administrare": "Administrat de AJVPS SIBIU"
  },
  {
    "name": "Lac acumulare Siriu",
    "subtitle": "Lac în județul Buzău",
    "administrare": "Administrat de AJVPS BUZĂU"
  },
  {
    "name": "Lac acumulare Slatina cu bălțile adiacente",
    "subtitle": "Lac în județul Olt",
    "administrare": "Administrat de AJVPS OLT"
  },
  {
    "name": "Lac acumulare Strejești",
    "subtitle": "Lac în județul Olt",
    "administrare": "Administrat de AJVPS OLT"
  },
  {
    "name": "Lac acumulare Sălățig",
    "subtitle": "Lac în județul Sălaj",
    "administrare": "Administrat de AJVPS SĂLAJ"
  },
  {
    "name": "Lac acumulare Voila",
    "subtitle": "Lac în județul Brașov",
    "administrare": "Administrat de AVPS FĂGĂRAȘ"
  },
  {
    "name": "Lac acumulare Vâlcele",
    "subtitle": "Lac în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Lac acumulare Vârșolț",
    "subtitle": "Lac în județul Sălaj",
    "administrare": "Administrat de AJVPS SĂLAJ"
  },
  {
    "name": "Lac acumulare Zigoneni",
    "subtitle": "Lac în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Lac Alcatraz Câmpenești - EC 6",
    "subtitle": "Câmpenești, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Balta Gării",
    "subtitle": "Lac în județul Olt",
    "administrare": "Administrat de ANPA - Ape Necontractate"
  },
  {
    "name": "Lac baraj Gura Râului",
    "subtitle": "Lac în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Lac baraj Zetea",
    "subtitle": "Lac în județul Harghita",
    "administrare": "Administrat de AVPS TÂRNAVA MARE"
  },
  {
    "name": "Lac Bicaz",
    "subtitle": "Lac în județul Neamț",
    "administrare": "Administrat de AJVPS NEAMȚ"
  },
  {
    "name": "Lac Biharia",
    "subtitle": "Biharia, Bihor",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Bodi Ferneziu",
    "subtitle": "Lac în județul Maramureș",
    "administrare": "Administrat de Direcția Silvica Maramureș"
  },
  {
    "name": "Lac Bolboci",
    "subtitle": "Lac în județul Dâmbovița",
    "administrare": "Administrat de Direcția Silvică Dâmbovița"
  },
  {
    "name": "Lac Bâtca Doamnei",
    "subtitle": "Lac în județul Neamț",
    "administrare": "Administrat de AJVPS NEAMȚ"
  },
  {
    "name": "Lac Bărăi",
    "subtitle": "Bărăi, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Chișineu-Criș",
    "subtitle": "Lac în județul Arad",
    "administrare": "Administrat de AJVPS ARAD"
  },
  {
    "name": "Lac Cilieni I,II,III",
    "subtitle": "Lac în județul Dolj",
    "administrare": "Administrat de AJVPS DOLJ"
  },
  {
    "name": "Lac Copilul",
    "subtitle": "Lac în județul Arad",
    "administrare": "Administrat de AJVPS ARAD"
  },
  {
    "name": "Lac Cozia",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de AJVPS HUNEDOARA"
  },
  {
    "name": "Lac Câmpenești 1",
    "subtitle": "Câmpenești, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Câmpenești 2",
    "subtitle": "Câmpenești, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Câmpenești 3",
    "subtitle": "Câmpenești, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Câmpenești 4",
    "subtitle": "Câmpenești, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Căprioara",
    "subtitle": "Recea-Cristur, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac de acumulare Stânca - Costești",
    "subtitle": "Lac în județul Botoșani",
    "administrare": "Administrat de AJVPS BOTOȘANI"
  },
  {
    "name": "Lac Dognecea Mare",
    "subtitle": "Lac în județul Caraș-Severin",
    "administrare": "Administrat de AP BANATUL"
  },
  {
    "name": "Lac Dognecea Mică",
    "subtitle": "Lac în județul Caraș-Severin",
    "administrare": "Administrat de AP BANATUL"
  },
  {
    "name": "Lac Dragomirna",
    "subtitle": "Mitocu Dragomirnei, Suceava",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Filea 1",
    "subtitle": "Comuna Ciurila, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Filea 2",
    "subtitle": "Comuna Ciurila, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Filea Mare",
    "subtitle": "Comuna Ciurila, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Fodora",
    "subtitle": "Fodora, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Frontiera Borș Horgásztó",
    "subtitle": "Borș, Bihor",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Frumoasa",
    "subtitle": "Lac în județul Harghita",
    "administrare": "Administrat de AVPS MIERCUREA-CIUC"
  },
  {
    "name": "Lac Făerag",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de APS DEVA"
  },
  {
    "name": "Lac La Sote",
    "subtitle": "Comuna Ciurila, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Medreș",
    "subtitle": "Lac în județul Caraș-Severin",
    "administrare": "Administrat de AP BANATUL"
  },
  {
    "name": "Lac Mesteacăn",
    "subtitle": "Lac în județul Harghita",
    "administrare": "Administrat de ANPA - Ape Necontractate"
  },
  {
    "name": "Lac Mica",
    "subtitle": "Mica, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Mișca",
    "subtitle": "Lac în județul Arad",
    "administrare": "Administrat de AJVPS ARAD"
  },
  {
    "name": "Lac Moby Dick",
    "subtitle": "Dorolț, Satu Mare",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac montan Iezerul Mare",
    "subtitle": "Lac în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Lac montan Podragu mic",
    "subtitle": "Lac în județul Sibiu",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Lac Măneciu",
    "subtitle": "Lac în județul Prahova",
    "administrare": "Administrat de AJVPS PRAHOVA"
  },
  {
    "name": "Lac Paclisa",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Pro Pescar"
  },
  {
    "name": "Lac Paltinu",
    "subtitle": "Lac în județul Prahova",
    "administrare": "Administrat de A.PENEȘ CURCANUL"
  },
  {
    "name": "Lac Pangrati",
    "subtitle": "Lac în județul Neamț",
    "administrare": "Administrat de AJVPS NEAMȚ"
  },
  {
    "name": "Lac Pescuit Fizeșu Gherlii",
    "subtitle": "Fizeșu Gherlii, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Pescuit Sportiv Câmpenești - EC 5",
    "subtitle": "Câmpenești, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Poiana Corbilor - Dorolea",
    "subtitle": "Livezile, Bistrița-Năsăud",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Poiana Uzului",
    "subtitle": "Lac în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Lac Pucioasa",
    "subtitle": "Lac în județul Dâmbovița",
    "administrare": "Administrat de AJVPS DÂMBOVIȚA"
  },
  {
    "name": "Lac Pâncota",
    "subtitle": "Lac în județul Arad",
    "administrare": "Administrat de AJVPS ARAD"
  },
  {
    "name": "Lac Reconstrucția",
    "subtitle": "Lac în județul Neamț",
    "administrare": "Administrat de AJVPS NEAMȚ"
  },
  {
    "name": "Lac Roșieni",
    "subtitle": "Roșieni, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Scropoasa",
    "subtitle": "Lac în județul Dâmbovița",
    "administrare": "Administrat de Direcția Silvică Dâmbovița"
  },
  {
    "name": "Lac Secu",
    "subtitle": "Lac în județul Caraș-Severin",
    "administrare": "Administrat de AP BANATUL"
  },
  {
    "name": "Lac Sucutard-Chiriș",
    "subtitle": "Sucutard, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Sânmărghita",
    "subtitle": "Sânmărghita, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Sântioana - La Costică",
    "subtitle": "Sântioana, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Săliștea Veche",
    "subtitle": "Saliștea Veche, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Teiu Mavexim",
    "subtitle": "Teiu, Argeș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Tismana",
    "subtitle": "Lac în județul Gorj",
    "administrare": "Administrat de ANPA - Ape Necontractate"
  },
  {
    "name": "Lac Tăul Teliucului",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de APS DEVA"
  },
  {
    "name": "Lac Vaduri",
    "subtitle": "Lac în județul Neamț",
    "administrare": "Administrat de AJVPS NEAMȚ"
  },
  {
    "name": "Lac Valea de Pești",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Pro Pescar"
  },
  {
    "name": "Lac Valea Mare",
    "subtitle": "Lac în județul Gorj",
    "administrare": "Administrat de ANPA - Ape Necontractate"
  },
  {
    "name": "Lac Vâja",
    "subtitle": "Lac în județul Gorj",
    "administrare": "Administrat de Direcția Silvica Gorj"
  },
  {
    "name": "Lac Văcărești (Perșinari )",
    "subtitle": "Lac în județul Dâmbovița",
    "administrare": "Administrat de AJVPS DÂMBOVIȚA"
  },
  {
    "name": "Lac Zădăreni",
    "subtitle": "Lac în județul Arad",
    "administrare": "Administrat de AJVPS ARAD"
  },
  {
    "name": "Lac Zăvoiul Orbului",
    "subtitle": "Lac în județul Dâmbovița",
    "administrare": "Administrat de AJVPS DÂMBOVIȚA"
  },
  {
    "name": "Lac Șieu",
    "subtitle": "Șieu, Bistrița-Năsăud",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Șutu",
    "subtitle": "Comuna Ciurila, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Țaga Mare",
    "subtitle": "Țaga, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lac Țaga Mică",
    "subtitle": "Țaga, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul 1 Gheorgheni",
    "subtitle": "Lac în județul Cluj",
    "administrare": "Administrat de AJPS Cluj"
  },
  {
    "name": "Lacul 3 Gheorgheni",
    "subtitle": "Lac în județul Cluj",
    "administrare": "Administrat de AJPS Cluj"
  },
  {
    "name": "Lacul Aroneanu",
    "subtitle": "Aroneanu, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Bentu lui Cotoi",
    "subtitle": "Lac în județul Ialomița",
    "administrare": "Administrat de AVPS IALOMIȚA"
  },
  {
    "name": "Lacul Bentu Mare Bordușani",
    "subtitle": "Lac în județul Ialomița",
    "administrare": "Administrat de AVPS IALOMIȚA"
  },
  {
    "name": "Lacul Bentu Mic Bordușani",
    "subtitle": "Lac în județul Ialomița",
    "administrare": "Administrat de AVPS IALOMIȚA"
  },
  {
    "name": "Lacul Bistra Iezer",
    "subtitle": "Lac în județul Caraș-Severin",
    "administrare": "Administrat de ANPA - Ape Necontractate"
  },
  {
    "name": "Lacul Bondureasa",
    "subtitle": "Lac în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Lacul Brădeni",
    "subtitle": "Brădeni, Sibiu",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Brăteni",
    "subtitle": "Brăteni, Bistrița-Năsăud",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Cinciș",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Pro Pescar"
  },
  {
    "name": "Lacul Ciurbești",
    "subtitle": "Dumbrava, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Colibița",
    "subtitle": "Lac în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Lacul Câmpu lui Neag",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Pro Pescar"
  },
  {
    "name": "Lacul Căprioarelor",
    "subtitle": "Turda, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Darvari",
    "subtitle": "Darvari, Călărași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul de acumulare Beliș-Fântânele",
    "subtitle": "Lac în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Lacul de acumulare Floroiu",
    "subtitle": "Lac în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Lacul de acumulare Gilău",
    "subtitle": "Lac în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Lacul de acumulare Hațeg",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Pro Pescar"
  },
  {
    "name": "Lacul de acumulare Lățunaș",
    "subtitle": "Lac în județul Timiș",
    "administrare": "Administrat de AJVPS TIMIȘ"
  },
  {
    "name": "Lacul de acumulare Someșul Cald",
    "subtitle": "Lac în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Lacul Dumbrăvița",
    "subtitle": "Lac în județul Timiș",
    "administrare": "Administrat de AJVPS TIMIȘ"
  },
  {
    "name": "Lacul Geaca 3",
    "subtitle": "Geaca, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Gura Golumbului",
    "subtitle": "Lac în județul Caraș-Severin",
    "administrare": "Administrat de AJVPS CARAȘ-SEVERIN"
  },
  {
    "name": "Lacul Găiceana",
    "subtitle": "Găiceana, Bacău",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Herăstrău",
    "subtitle": "București, București",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Horgești",
    "subtitle": "Horgești, Bacău",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Iannis",
    "subtitle": "Mădăraș, Bihor",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Ivanul",
    "subtitle": "Lac în județul Mehedinți",
    "administrare": "Administrat de Direcția Silvică Mehedinți"
  },
  {
    "name": "Lacul Izvorul (Măgurii)",
    "subtitle": "Lac în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Lacul Lazuri 5",
    "subtitle": "Comișani, Dâmbovița",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Lighet",
    "subtitle": "Lac în județul Maramureș",
    "administrare": "Administrat de APS CHEILE LĂPUȘULUI"
  },
  {
    "name": "Lacul lui Jack",
    "subtitle": "Țaga, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul lui Tibi",
    "subtitle": "Sântejude-Vale, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Malaia",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Lacul Micești",
    "subtitle": "Micești, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul montan Avrig",
    "subtitle": "Lac în județul Sibiu",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Lacul montan Doamnei",
    "subtitle": "Lac în județul Sibiu",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Lacul montan Iezerul Mic",
    "subtitle": "Lac în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Lacul montan Podrăgel",
    "subtitle": "Lac în județul Sibiu",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Lacul montan Sadu II",
    "subtitle": "Lac în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Lacul Muntinu",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Lacul Mălaia",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de ANPA - Ape Necontractate"
  },
  {
    "name": "Lacul Nicmar Clinceni",
    "subtitle": "Clinceni, Ilfov",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Ostrov",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Pro Pescar"
  },
  {
    "name": "Lacul Paradisul Verde",
    "subtitle": "Viile Tecii, Bistrița-Năsăud",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Pleasa",
    "subtitle": "Bucov, Prahova",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Pojorâta (Iezer)",
    "subtitle": "Lac în județul Suceava",
    "administrare": "Administrat de ANPA - Ape Necontractate"
  },
  {
    "name": "Lacul Roșu",
    "subtitle": "Lac în județul Harghita",
    "administrare": "Administrat de Direcția Silvică Harghita"
  },
  {
    "name": "Lacul Someșul Cald",
    "subtitle": "Lac în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Lacul Sub Pădure Mărtinești",
    "subtitle": "Mărtinești, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Subcetate",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Pro Pescar"
  },
  {
    "name": "Lacul Săcălaia (Lacul Știucilor)",
    "subtitle": "Lac în județul Cluj",
    "administrare": "Administrat de AJPS Cluj"
  },
  {
    "name": "Lacul Tarnița",
    "subtitle": "Lac în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Lacul Tonciu",
    "subtitle": "Tonciu, Bistrița-Năsăud",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Toplița",
    "subtitle": "Lac în județul Bihor",
    "administrare": "Administrat de AV VIDA SURDUCEL DOBREȘTI"
  },
  {
    "name": "Lacul Topolovățul",
    "subtitle": "Lac în județul Timiș",
    "administrare": "Administrat de AJVPS TIMIȘ"
  },
  {
    "name": "Lacul Tuglui",
    "subtitle": "Jiul, Dolj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Tungujei",
    "subtitle": "Tungujei, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Tâncăbești 2",
    "subtitle": "Tâncăbești, Ilfov",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacul Tăul Zânelor",
    "subtitle": "Lac în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Lacul Urlea",
    "subtitle": "Lac în județul Brașov",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Lacul Valea Băii",
    "subtitle": "Lac în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Lacul Vlădești",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Lacul Șoimu",
    "subtitle": "Lac în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Lacul Șuica",
    "subtitle": "Șuica, Olt",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lacurile SunFish Mărtinești",
    "subtitle": "Mărtinești, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Laguna Verde Noroieni",
    "subtitle": "Noroieni, Satu Mare",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lia",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Liberty Fishing & Recreation",
    "subtitle": "Toplița, Harghita",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "LIN Lake",
    "subtitle": "Satu Mare, Satu Mare",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Lunca Corbului",
    "subtitle": "Lunca Corbului, Argeș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Mija",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Monster Carp Lake",
    "subtitle": "Zimandu Nou, Arad",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Mărghitaș",
    "subtitle": "Lac în județul Caraș-Severin",
    "administrare": "Administrat de Direcția Silvică Caraș-Severin"
  },
  {
    "name": "Mărtinești Iaz",
    "subtitle": "Mărtinești, Cluj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Mărul superior",
    "subtitle": "Lac în județul Caraș-Severin",
    "administrare": "Administrat de Direcția Silvică Caraș-Severin"
  },
  {
    "name": "Oașa",
    "subtitle": "Lac în județul Sibiu",
    "administrare": "Administrat de Direcția Silvică Sibiu"
  },
  {
    "name": "Oglinda Mândrii",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Orlat Lake",
    "subtitle": "Orlat, Sibiu",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Ozone Lake",
    "subtitle": "Purcăreni, Argeș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Peleaga",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Pescăria Balta Blondă",
    "subtitle": "Satu Mare, Satu Mare",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Pescăria Boghiș La Stuf",
    "subtitle": "Boghiș, Satu Mare",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Pescăria Eteni",
    "subtitle": "Halmeu, Satu Mare",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Pescăria La Micuțu",
    "subtitle": "Căptălan, Alba",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Petrimanu",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de Direcția Silvică Vâlcea"
  },
  {
    "name": "PlayGround Club",
    "subtitle": "Șard, Alba",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Poalele Codrului - Balta Ciurea",
    "subtitle": "Ciurea, Iași",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Podragu Mare",
    "subtitle": "Lac în județul Sibiu",
    "administrare": "Administrat de Direcția Silvică Sibiu"
  },
  {
    "name": "Poienita Agrotur",
    "subtitle": "Dracșani, Botoșani",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Prisaca Cerna",
    "subtitle": "Lac în județul Caraș-Severin",
    "administrare": "Administrat de Direcția Silvică Caraș-Severin"
  },
  {
    "name": "Prut– fără lacul Stânca",
    "subtitle": "Râu în județul Botoșani",
    "administrare": "Administrat de AJVPS BOTOȘANI"
  },
  {
    "name": "Pâraiele Boia Mare",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Pârâul Lesuntu",
    "subtitle": "Râu în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Pârâul Lotrișor",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Pârâul Murgoci",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Pârâul Nou Roman",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Pârâul Rosua",
    "subtitle": "Râu în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Pârâul Râul Vadului",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Pârâul Tălmăcuț",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Pârâul Uria",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Pârâul Valea Leșului",
    "subtitle": "Râu în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Pârâul Valea Rîndiboului",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Pârâul Valea Strâmbii",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Resort Fishing Ardusat",
    "subtitle": "Ardusat, Maramureș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Roşiile (Tăul fără Fund)",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Râul Amaradia",
    "subtitle": "Râu în județul Gorj",
    "administrare": "Administrat de AJVPS GORJ"
  },
  {
    "name": "Râul Ampoi",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Râul Anieș",
    "subtitle": "Râu în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Râul Aranca",
    "subtitle": "Râu în județul Arad",
    "administrare": "Administrat de AJVPS ARAD"
  },
  {
    "name": "Râul Argeș",
    "subtitle": "Râu în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Râul Argeș",
    "subtitle": "Râu în județul Dâmbovița",
    "administrare": "Administrat de AJVPS DÂMBOVIȚA"
  },
  {
    "name": "Râul Argeșel inferior",
    "subtitle": "Râu în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Râul Argeșel Superior",
    "subtitle": "Râu în județul Argeș",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Râul Arieș",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de AJVPS CLUJ"
  },
  {
    "name": "Râul Arieș",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Râul Asău",
    "subtitle": "Râu în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Râul Avrigul Mare",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Râul Bahna",
    "subtitle": "Râu în județul Botoșani",
    "administrare": "Administrat de AJVPS BOTOȘANI"
  },
  {
    "name": "Râul Barcău",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Râul Bașeu",
    "subtitle": "Râu în județul Botoșani",
    "administrare": "Administrat de AJVPS BOTOȘANI"
  },
  {
    "name": "Râul Berzasca",
    "subtitle": "Râu în județul Caraș-Severin",
    "administrare": "Administrat de AP BANATUL"
  },
  {
    "name": "Râul Bistricioara",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Bistrița",
    "subtitle": "Râu în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Râul Bistrița",
    "subtitle": "Râu în județul Gorj",
    "administrare": "Administrat de AJVPS GORJ"
  },
  {
    "name": "Râul Bistrița Aurie II",
    "subtitle": "Râu în județul Suceava",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Râul Blahnița",
    "subtitle": "Râu în județul Gorj",
    "administrare": "Administrat de AJVPS GORJ"
  },
  {
    "name": "Râul Boia",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Boia Mică",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Bordușelu",
    "subtitle": "Râu în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Râul Bratia Inferior",
    "subtitle": "Râu în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Râul Bucureasa",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Budacul inferior",
    "subtitle": "Râu în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Râul Budacul superior",
    "subtitle": "Râu în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Râul Bughea",
    "subtitle": "Râu în județul Argeș",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Râul Buzău",
    "subtitle": "Râu în județul Brăila",
    "administrare": "Administrat de AJVPS Brăila"
  },
  {
    "name": "Râul Bârzava",
    "subtitle": "Râu în județul Caraș-Severin",
    "administrare": "Administrat de AP BANATUL"
  },
  {
    "name": "Râul Casinul inferior",
    "subtitle": "Râu în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Râul Cerna",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Cheia",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Cibin",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Râul Cibinul Inferior",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Râul Cibinul Mare",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Râul Cibinul Mic",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Râul Ciobănuș",
    "subtitle": "Râu în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Râul Colentina",
    "subtitle": "Râu în județul Dâmbovița",
    "administrare": "Administrat de AJVPS DÂMBOVIȚA"
  },
  {
    "name": "Râul Colentina",
    "subtitle": "Râu în județul Ilfov",
    "administrare": "Administrat de AVPS ACVILA"
  },
  {
    "name": "Râul Corhana",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Râul Cormaia",
    "subtitle": "Râu în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Râul Cricov",
    "subtitle": "Râu în județul Dâmbovița",
    "administrare": "Administrat de AJVPS DÂMBOVIȚA"
  },
  {
    "name": "Râul Cricovul Dulce",
    "subtitle": "Râu în județul Prahova",
    "administrare": "Administrat de AJVPS PRAHOVA"
  },
  {
    "name": "Râul Cricovul Sărat",
    "subtitle": "Râu în județul Prahova",
    "administrare": "Administrat de AJVPS PRAHOVA"
  },
  {
    "name": "Râul Crișul Alb",
    "subtitle": "Râu în județul Arad",
    "administrare": "Administrat de AJVPS ARAD"
  },
  {
    "name": "Râul Crișul Băița",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Râul Crișul Negru",
    "subtitle": "Râu în județul Arad",
    "administrare": "Administrat de AJVPS ARAD"
  },
  {
    "name": "Râul Crișul Negru",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Râul Crișul Negru inferior",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Râul Crișul Negru mijlociu",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Râul Crișul Repede",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Râul Crișul Repede inferior",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Râul Crișul Repede Mijlociu",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Râul Cugir",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Râul Călmățui",
    "subtitle": "Râu în județul Brăila",
    "administrare": "Administrat de AJVPS Brăila"
  },
  {
    "name": "Râul Căpuș",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de AJPS Cluj"
  },
  {
    "name": "Râul Doamnei inferior",
    "subtitle": "Râu în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Râul Doamnei Superior",
    "subtitle": "Râu în județul Argeș",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Râul Dobra",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Râul Dâmbovița",
    "subtitle": "Râu în județul Dâmbovița",
    "administrare": "Administrat de AJVPS DÂMBOVIȚA"
  },
  {
    "name": "Râul Dâmbovița",
    "subtitle": "Râu în județul Ilfov",
    "administrare": "Administrat de AVPS ACVILA"
  },
  {
    "name": "Râul Dâmbovița mijlociu",
    "subtitle": "Râu în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Râul Dâmbovița Superioară",
    "subtitle": "Râu în județul Argeș",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Râul Dârjov",
    "subtitle": "Râu în județul Olt",
    "administrare": "Administrat de AJVPS OLT"
  },
  {
    "name": "Râul Fizeș",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de AJPS Cluj"
  },
  {
    "name": "Râul Geamăna",
    "subtitle": "Râu în județul Brașov",
    "administrare": "Administrat de AJPS Brașov"
  },
  {
    "name": "Râul Geamărtălui",
    "subtitle": "Râu în județul Olt",
    "administrare": "Administrat de AJVPS OLT"
  },
  {
    "name": "Râul Geoagiu Superior",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Râul Gersa",
    "subtitle": "Râu în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Râul Gilort",
    "subtitle": "Râu în județul Gorj",
    "administrare": "Administrat de AJVPS GORJ"
  },
  {
    "name": "Râul Govăjdia",
    "subtitle": "Râu în județul Hunedoara",
    "administrare": "Administrat de Pro Pescar"
  },
  {
    "name": "Râul Grotului",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Holod",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Râul Ialomița",
    "subtitle": "Râu în județul Dâmbovița",
    "administrare": "Administrat de AJVPS DÂMBOVIȚA"
  },
  {
    "name": "Râul Ilfov",
    "subtitle": "Râu în județul Dâmbovița",
    "administrare": "Administrat de AJVPS DÂMBOVIȚA"
  },
  {
    "name": "Râul Jilț",
    "subtitle": "Râu în județul Gorj",
    "administrare": "Administrat de AJVPS GORJ"
  },
  {
    "name": "Râul Jiu",
    "subtitle": "Râu în județul Gorj",
    "administrare": "Administrat de A.CERBUL CARPATIN"
  },
  {
    "name": "Râul Jiul de est Inferior",
    "subtitle": "Râu în județul Hunedoara",
    "administrare": "Administrat de Pro Pescar"
  },
  {
    "name": "Râul Jiul de vest mijlociu",
    "subtitle": "Râu în județul Hunedoara",
    "administrare": "Administrat de Pro Pescar"
  },
  {
    "name": "Râul Jiul de vest – superior cu afluenții",
    "subtitle": "Râu în județul Hunedoara",
    "administrare": "Administrat de Pro Pescar"
  },
  {
    "name": "Râul Jiul Inferior",
    "subtitle": "Râu în județul Hunedoara",
    "administrare": "Administrat de Pro Pescar"
  },
  {
    "name": "Râul Lopatna",
    "subtitle": "Râu în județul Prahova",
    "administrare": "Administrat de AJVPS PRAHOVA"
  },
  {
    "name": "Râul Lotrioara",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Râul Lotru mijlociu",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Lotrul Inferior",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Luncavăț",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Malaia",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Mare inferior II",
    "subtitle": "Râu în județul Hunedoara",
    "administrare": "Administrat de Pro Pescar"
  },
  {
    "name": "Râul Molnița",
    "subtitle": "Râu în județul Botoșani",
    "administrare": "Administrat de AJVPS BOTOȘANI"
  },
  {
    "name": "Râul Motru",
    "subtitle": "Râu în județul Gorj",
    "administrare": "Administrat de AJVPS GORJ"
  },
  {
    "name": "Râul Mureș",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Râul Mureș",
    "subtitle": "Râu în județul Arad",
    "administrare": "Administrat de AJVPS ARAD"
  },
  {
    "name": "Râul Măgura Cisnădiei",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Râul Măieruș",
    "subtitle": "Râu în județul Brașov",
    "administrare": "Administrat de AJPS Brașov"
  },
  {
    "name": "Râul Nadăș",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de AJPS Cluj"
  },
  {
    "name": "Râul Neajlov",
    "subtitle": "Râu în județul Dâmbovița",
    "administrare": "Administrat de AJVPS DÂMBOVIȚA"
  },
  {
    "name": "Râul Ocoliș",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Râul Oituzul Moldovenesc",
    "subtitle": "Râu în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Râul Olt",
    "subtitle": "Râu în județul Olt",
    "administrare": "Administrat de AJVPS OLT"
  },
  {
    "name": "Râul Olt",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Olt",
    "subtitle": "Râu în județul Brașov",
    "administrare": "Administrat de AJPS Brașov"
  },
  {
    "name": "Râul Olt și afluenții săi",
    "subtitle": "Râu în județul Brașov",
    "administrare": "Administrat de AVPS RUPEA"
  },
  {
    "name": "Râul Olteț",
    "subtitle": "Râu în județul Olt",
    "administrare": "Administrat de AJVPS OLT"
  },
  {
    "name": "Râul Olteț",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Olănești",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Orlea",
    "subtitle": "Râu în județul Gorj",
    "administrare": "Administrat de AJVPS GORJ"
  },
  {
    "name": "Râul Plescioara",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Pleșu",
    "subtitle": "Râu în județul Botoșani",
    "administrare": "Administrat de AJVPS BOTOȘANI"
  },
  {
    "name": "Râul Potop",
    "subtitle": "Râu în județul Dâmbovița",
    "administrare": "Administrat de AJVPS DÂMBOVIȚA"
  },
  {
    "name": "Râul Poșaga",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Râul Prahova inferioară",
    "subtitle": "Râu în județul Prahova",
    "administrare": "Administrat de AJVPS PRAHOVA"
  },
  {
    "name": "Râul Prahova mijlocie",
    "subtitle": "Râu în județul Prahova",
    "administrare": "Administrat de AVPS Câmpina"
  },
  {
    "name": "Râul Prahova superioară",
    "subtitle": "Râu în județul Prahova",
    "administrare": "Administrat de AVPS Câmpina"
  },
  {
    "name": "Râul Repedea",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Rudăreasa",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Rudărie",
    "subtitle": "Râu în județul Caraș-Severin",
    "administrare": "Administrat de AP BANATUL"
  },
  {
    "name": "Râul Râmești",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Sabar",
    "subtitle": "Râu în județul Dâmbovița",
    "administrare": "Administrat de AJVPS DÂMBOVIȚA"
  },
  {
    "name": "Râul Sadu Inferior",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Râul Sașa",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Sebeș",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Râul Sebeșul de Jos",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Râul Sebeșul de Sus",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Râul Secaș",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Râul Siret",
    "subtitle": "Râu în județul Botoșani",
    "administrare": "Administrat de AJVPS BOTOȘANI"
  },
  {
    "name": "Râul Siret",
    "subtitle": "Râu în județul Brăila",
    "administrare": "Administrat de AJVPS Brăila"
  },
  {
    "name": "Râul Slănic Moldova",
    "subtitle": "Râu în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Râul Sohodol I",
    "subtitle": "Râu în județul Gorj",
    "administrare": "Administrat de A.CERBUL CARPATIN"
  },
  {
    "name": "Râul Sohodol II",
    "subtitle": "Râu în județul Gorj",
    "administrare": "Administrat de AJVPS GORJ"
  },
  {
    "name": "Râul Someș",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de AJVPS CLUJ"
  },
  {
    "name": "Râul Someșul Mare",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de AJVPS CLUJ"
  },
  {
    "name": "Râul Someșul Mare inferior",
    "subtitle": "Râu în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Râul Someșul Mic",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de AJVPS CLUJ"
  },
  {
    "name": "Râul Someșul Mic",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de AJPS Cluj"
  },
  {
    "name": "Râul Streiul montan inferior",
    "subtitle": "Râu în județul Hunedoara",
    "administrare": "Administrat de Pro Pescar"
  },
  {
    "name": "Râul Strâmba",
    "subtitle": "Râu în județul Brașov",
    "administrare": "Administrat de AJPS Brașov"
  },
  {
    "name": "Râul Sulta",
    "subtitle": "Râu în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Râul Săliște",
    "subtitle": "Râu în județul Sibiu",
    "administrare": "Administrat de FLY FISHING CLUB SIBIU"
  },
  {
    "name": "Râul Sălăuța Inferioară",
    "subtitle": "Râu în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Râul Tazlău",
    "subtitle": "Râu în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Râul Tazlăul Sărat",
    "subtitle": "Râu în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Râul Teleajen inferior",
    "subtitle": "Râu în județul Prahova",
    "administrare": "Administrat de AJVPS PRAHOVA"
  },
  {
    "name": "Râul Teleajen inferior - Bucov",
    "subtitle": "Râu în județul Prahova",
    "administrare": "Administrat de AJVPS PRAHOVA"
  },
  {
    "name": "Râul Teleajen superior",
    "subtitle": "Râu în județul Prahova",
    "administrare": "Administrat de AJVPS PRAHOVA"
  },
  {
    "name": "Râul Teleajenul inferior",
    "subtitle": "Râu în județul Prahova",
    "administrare": "Administrat de AJVPS PRAHOVA"
  },
  {
    "name": "Râul Tismana",
    "subtitle": "Râu în județul Gorj",
    "administrare": "Administrat de AJVPS GORJ"
  },
  {
    "name": "Râul Topolog",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Trotuș",
    "subtitle": "Râu în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Râul Târgului inferior",
    "subtitle": "Râu în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Râul Târgului mijlociu",
    "subtitle": "Râu în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Râul Târgului superior",
    "subtitle": "Râu în județul Argeș",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Râul Târnava Mare",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Râul Târnava Mică",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Râul Tărcăița",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Râul Tărâia",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Urșani",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Râul Uzul",
    "subtitle": "Râu în județul Bacău",
    "administrare": "Administrat de AJVPS BACĂU"
  },
  {
    "name": "Râul Valea Ilvei",
    "subtitle": "Râu în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Râul Valea Morilor",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Râul Volovăț",
    "subtitle": "Râu în județul Botoșani",
    "administrare": "Administrat de AJVPS BOTOȘANI"
  },
  {
    "name": "Râul Vorona",
    "subtitle": "Râu în județul Botoșani",
    "administrare": "Administrat de AJVPS BOTOȘANI"
  },
  {
    "name": "Râul Vâlsan Inferior",
    "subtitle": "Râu în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Râul Vâslan mijlociu",
    "subtitle": "Râu în județul Argeș",
    "administrare": "Administrat de AJVPS ARGEȘ"
  },
  {
    "name": "Râul Vărbilău",
    "subtitle": "Râu în județul Prahova",
    "administrare": "Administrat de AJVPS PRAHOVA"
  },
  {
    "name": "Râul Șieu",
    "subtitle": "Râu în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Râul Șușița",
    "subtitle": "Râu în județul Gorj",
    "administrare": "Administrat de AJVPS GORJ"
  },
  {
    "name": "Râul Țibleș",
    "subtitle": "Râu în județul Bistrița-Năsăud",
    "administrare": "Administrat de AJVPS BISTRIŢA NĂSĂUD"
  },
  {
    "name": "Råul Geoagiu Inferior",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Sadu V",
    "subtitle": "Lac în județul Sibiu",
    "administrare": "Administrat de Direcția Silvică Sibiu"
  },
  {
    "name": "Slăvei",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "SMV Lake",
    "subtitle": "Cipău, Mureș",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Someșu Rece Mijlociu",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Someșu Rece Superior",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Someșul Cald Mijlociu",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Someșul Cald Superior",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Someșul Rece Inferior",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Săcuieul Inferior",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Săcuieul Superior",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Topa – Holod",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Trei Ape",
    "subtitle": "Lac în județul Caraș-Severin",
    "administrare": "Administrat de Direcția Silvică Caraș-Severin"
  },
  {
    "name": "Tăria Mare",
    "subtitle": "Lac în județul Caraș-Severin",
    "administrare": "Administrat de Direcția Silvică Caraș-Severin"
  },
  {
    "name": "Tăul Verde (Sliveiu Mare)",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Tăul Înghetat (Custura)",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Tăul Ţapului",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Un Colţ de Rai",
    "subtitle": "Colţ de Rai, Dolj",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Valea Bistrei",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Valea Bistrei",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Valea Buduresei",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Valea Caselor",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Valea Cârlibabei",
    "subtitle": "Râu în județul Suceava",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Valea Călinești cu pâraiele Călinești, Sulița, Soci",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Valea Dobricionești",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Valea Drăganului",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Valea Gepiș",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Valea Homorod",
    "subtitle": "Râu în județul Brașov",
    "administrare": "Administrat de AJPS Brașov"
  },
  {
    "name": "Valea Ierii Mijlocie",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Valea Ierii Superioară",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Valea Ierului",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Valea Lonei",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de AJPS Cluj"
  },
  {
    "name": "Valea Mișidului",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Valea Omului",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Valea Polatiște",
    "subtitle": "Râu în județul Hunedoara",
    "administrare": "Administrat de Pro Pescar"
  },
  {
    "name": "Valea Robești",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Valea Robești",
    "subtitle": "Râu în județul Vâlcea",
    "administrare": "Administrat de AJVPS VÂLCEA"
  },
  {
    "name": "Valea Răcătăului",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Valea Sighiștelului",
    "subtitle": "Râu în județul Bihor",
    "administrare": "Administrat de AJVPS BIHOR"
  },
  {
    "name": "Valea Vadului",
    "subtitle": "Râu în județul Cluj",
    "administrare": "Administrat de D.S. Cluj"
  },
  {
    "name": "Valea Şartăşului",
    "subtitle": "Râu în județul Alba",
    "administrare": "Administrat de AJVPS ALBA"
  },
  {
    "name": "Valea Țibăului",
    "subtitle": "Râu în județul Suceava",
    "administrare": "Administrat de APS AQUA CRISIUS"
  },
  {
    "name": "Varlaam - Sector A",
    "subtitle": "Varlaam, Giurgiu",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Varlaam - Sector B",
    "subtitle": "Varlaam, Giurgiu",
    "administrare": "Lac administrat privat"
  },
  {
    "name": "Vidra",
    "subtitle": "Lac în județul Vâlcea",
    "administrare": "Administrat de Direcția Silvică Vâlcea"
  },
  {
    "name": "Vinderel",
    "subtitle": "Lac în județul Maramureș",
    "administrare": "Administrat de Direcția Silvica Maramureș"
  },
  {
    "name": "Viorica",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Zănoaga",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  },
  {
    "name": "Ştevia",
    "subtitle": "Lac în județul Hunedoara",
    "administrare": "Administrat de Direcția Silvică Hunedoara"
  }
]

def get_water_type(name, subtitle, administrare=""):
    """Determină tipul de apă bazat pe nume, subtitlu și administrare"""
    name_lower = name.lower()
    subtitle_lower = subtitle.lower()
    administrare_lower = administrare.lower()
    
    # Verifică mai întâi administrarea pentru clasificare corectă
    if 'administrat privat' in administrare_lower:
        # Lac administrat privat = balti_private
        return 'balti_private'
    elif any(word in administrare_lower for word in ['ape necontractate', 'anpa', 'sălbatic']):
        # Ape necontractate = balti_salbatic
        return 'balti_salbatic'
    
    # Apoi verifică numele și subtitlul
    if any(word in name_lower for word in ['râu', 'râul', 'pârâu', 'canal']):
        return 'rau'
    elif any(word in name_lower for word in ['balta', 'iaz']):
        return 'balti_salbatic'  # Bălți sălbatice
    elif any(word in name_lower for word in ['lac', 'acumulare', 'baraj']):
        return 'lac'  # Lacuri mari
    else:
        return 'lac'  # default

def get_county_from_subtitle(subtitle):
    """Extrage județul din subtitlu"""
    county_map = {
        'Bacău': 'BC', 'Alba': 'AB', 'Vâlcea': 'VL', 'Botoșani': 'BT',
        'Timiș': 'TM', 'Giurgiu': 'GR', 'Hunedoara': 'HD', 'Teleorman': 'TR',
        'Prahova': 'PH', 'Dâmbovița': 'DB', 'Argeș': 'AG', 'Ialomița': 'IL',
        'Ilfov': 'IF', 'Gorj': 'GJ', 'Galați': 'GL', 'Brașov': 'BV',
        'Călărași': 'CL', 'Satu Mare': 'SM', 'Arad': 'AR', 'Bihor': 'BH',
        'Maramureș': 'MM', 'Caraș-Severin': 'CS', 'Sibiu': 'SB', 'Cluj': 'CJ',
        'Mureș': 'MS', 'Neamț': 'NT', 'Vaslui': 'VS', 'Iași': 'IS',
        'Vrancea': 'VN', 'Buzău': 'BZ', 'Dolj': 'DJ', 'Olt': 'OT',
        'Mehedinți': 'MH', 'Harghita': 'HR', 'Covasna': 'CV',
        'Bistrița-Năsăud': 'BN', 'Sălaj': 'SJ', 'Suceava': 'SV',
        'București': 'B'
    }
    
    for county_name, county_code in county_map.items():
        if county_name in subtitle:
            return county_code
    return 'UNKNOWN'

def get_region_from_county(county):
    """Mapare județ -> regiune istorică"""
    region_map = {
        'B': 'muntenia', 'IF': 'muntenia', 'IL': 'muntenia', 'CL': 'muntenia',
        'GR': 'muntenia', 'TR': 'muntenia', 'PH': 'muntenia', 'DB': 'muntenia',
        'AG': 'muntenia', 'BZ': 'muntenia', 'VN': 'muntenia',
        'IS': 'moldova', 'VS': 'moldova', 'BC': 'moldova', 'NT': 'moldova',
        'BT': 'moldova', 'SV': 'moldova',
        'DJ': 'oltenia', 'OT': 'oltenia', 'MH': 'oltenia', 'GJ': 'oltenia', 'VL': 'oltenia',
        'CJ': 'transilvania', 'AB': 'transilvania', 'SB': 'transilvania', 'MS': 'transilvania',
        'BN': 'transilvania', 'SJ': 'transilvania', 'HR': 'transilvania', 'CV': 'transilvania',
        'AR': 'banat', 'TM': 'banat', 'CS': 'banat',
        'BH': 'crisana', 'SM': 'crisana',
        'MM': 'maramures'
    }
    return region_map.get(county, 'muntenia')

def generate_coordinates(county, location_name=""):
    """Generează coordonate mai precise bazate pe județ și numele locației"""
    import random
    
    # Coordonate precise pentru centrele județelor
    county_coords = {
        'BC': (46.5679, 26.9139), 'AB': (46.0736, 23.5805), 'VL': (45.1000, 24.3833), 'BT': (47.7500, 26.6667),
        'TM': (45.7472, 21.2087), 'GR': (43.9000, 25.9667), 'HD': (45.7667, 22.9000), 'TR': (44.0000, 25.0000),
        'PH': (45.0000, 26.0000), 'DB': (44.9167, 25.4500), 'AG': (44.9167, 24.9167), 'IL': (44.5000, 27.0000),
        'IF': (44.5000, 26.0000), 'GJ': (45.0333, 23.2833), 'GL': (45.4333, 28.0333), 'BV': (45.6500, 25.6000),
        'CL': (44.4333, 24.3667), 'SM': (47.7833, 22.8833), 'AR': (46.1833, 21.3167), 'BH': (47.0667, 21.9167),
        'MM': (47.6667, 23.5833), 'CS': (45.4167, 22.2167), 'SB': (45.8000, 24.1500), 'CJ': (46.7667, 23.6000),
        'MS': (46.5500, 24.5667), 'NT': (46.9167, 26.3333), 'VS': (46.6333, 27.7333), 'IS': (47.1667, 27.6000),
        'VN': (45.7000, 27.0667), 'BZ': (45.1500, 26.8333), 'DJ': (44.3167, 23.8000), 'OT': (44.2500, 24.5000),
        'MH': (44.6333, 22.6500), 'HR': (46.3500, 25.8000), 'CV': (45.8500, 26.1833), 'BN': (47.1333, 24.4833),
        'SJ': (47.2000, 23.0500), 'SV': (47.6500, 26.2500), 'B': (44.4268, 26.1025)
    }
    
    base_lat, base_lng = county_coords.get(county, (45.0, 25.0))
    
    # Adaugă variație mică pentru a nu avea toate locațiile în același punct
    variation = 0.1  # ~11km
    lat_offset = random.uniform(-variation, variation)
    lng_offset = random.uniform(-variation, variation)
    
    return (base_lat + lat_offset, base_lng + lng_offset)

def generate_sql_insert(location):
    """Generează o instrucțiune SQL INSERT pentru o locație"""
    name = location['name'].replace("'", "''")  # Escape single quotes
    subtitle = location['subtitle'].replace("'", "''")  # Escape single quotes
    administrare = location['administrare'].replace("'", "''")  # Escape single quotes

    water_type = get_water_type(name, subtitle, administrare)
    county = get_county_from_subtitle(subtitle)
    region = get_region_from_county(county)
    lat, lng = generate_coordinates(county, name)

    # Câmpuri separate pentru subtitle și administrare
    sql = f"""('{name}', '{water_type}', '{county}', '{region}', {lat}, {lng}, '{subtitle}', '{administrare}', 'NEEDS_REAL_COORDINATES')"""

    return sql

# Generează SQL pentru toate locațiile
if __name__ == "__main__":
    print("-- =============================================")
    print("-- TOATE LOCATIILE DE PESCUIT (619 locatii)")
    print("-- =============================================")
    print()
    print("INSERT INTO public.fishing_locations (name, type, county, region, latitude, longitude, subtitle, administrare, image_url) VALUES")
    
    # Generează SQL pentru toate locațiile
    sql_values = []
    for i, location in enumerate(locations_data):
        sql_value = generate_sql_insert(location)
        sql_values.append(sql_value)
    
    # Afișează toate valorile separate prin virgulă
    for i, sql_value in enumerate(sql_values):
        if i == len(sql_values) - 1:
            print(sql_value + ";")
        else:
            print(sql_value + ",")
    
    print()
    print(f"-- Total: {len(locations_data)} locatii adaugate")
