/**
 * EmojiPicker - Selector de emoji compact pentru forum
 * Categorii: Pescuit, Fețe, Natură, Mâini, Altele
 * Cu căutare avansată (coduri Yahoo Messenger style)
 */

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  anchorRef?: React.RefObject<HTMLElement>;
}

// Emoji cu coduri și descrieri pentru căutare (Yahoo Messenger style)
interface EmojiData {
  emoji: string;
  codes: string[]; // Coduri scurte (ex: ":)", ":D", "smile", "zambet")
  category: string;
}

const emojiData: EmojiData[] = [
  // Pescuit
  { emoji: '🎣', codes: ['fishing', 'pescuit', 'fishing pole', 'undita'], category: 'Pescuit' },
  { emoji: '🐟', codes: ['fish', 'peste', 'fishy'], category: 'Pescuit' },
  { emoji: '🐠', codes: ['tropical fish', 'peste tropical', 'fish'], category: 'Pescuit' },
  { emoji: '🐡', codes: ['pufferfish', 'peste balon', 'fish'], category: 'Pescuit' },
  { emoji: '🦈', codes: ['shark', 'rechin'], category: 'Pescuit' },
  { emoji: '🐋', codes: ['whale', 'balena'], category: 'Pescuit' },
  { emoji: '🐳', codes: ['whale', 'balena', 'spouting'], category: 'Pescuit' },
  { emoji: '🐬', codes: ['dolphin', 'delfin'], category: 'Pescuit' },
  { emoji: '🦭', codes: ['seal', 'foca'], category: 'Pescuit' },
  { emoji: '🦐', codes: ['shrimp', 'creveta'], category: 'Pescuit' },
  { emoji: '🦞', codes: ['lobster', 'homar'], category: 'Pescuit' },
  { emoji: '🦑', codes: ['squid', 'calamar'], category: 'Pescuit' },
  { emoji: '🐙', codes: ['octopus', 'caracatita'], category: 'Pescuit' },
  { emoji: '🦀', codes: ['crab', 'crab'], category: 'Pescuit' },
  { emoji: '🐚', codes: ['shell', 'cochilie'], category: 'Pescuit' },
  { emoji: '🪝', codes: ['hook', 'cârlig', 'fishing hook'], category: 'Pescuit' },
  { emoji: '⛵', codes: ['sailboat', 'barca', 'boat'], category: 'Pescuit' },
  { emoji: '🚤', codes: ['speedboat', 'barca rapida', 'boat'], category: 'Pescuit' },
  { emoji: '⚓', codes: ['anchor', 'ancora'], category: 'Pescuit' },
  { emoji: '🌊', codes: ['wave', 'val', 'water'], category: 'Pescuit' },
  { emoji: '🏖️', codes: ['beach', 'plaja'], category: 'Pescuit' },
  { emoji: '🏝️', codes: ['island', 'insula'], category: 'Pescuit' },
  { emoji: '🌅', codes: ['sunrise', 'rasarit'], category: 'Pescuit' },
  { emoji: '🌄', codes: ['sunrise', 'rasarit', 'mountain'], category: 'Pescuit' },
  { emoji: '🧊', codes: ['ice', 'gheata'], category: 'Pescuit' },
  { emoji: '🥶', codes: ['cold', 'frig', 'freezing'], category: 'Pescuit' },
  
  // Fețe
  { emoji: '😀', codes: [':D', 'grinning', 'zambet mare', 'happy'], category: 'Fețe' },
  { emoji: '😁', codes: [':D', 'beaming', 'zambet', 'happy'], category: 'Fețe' },
  { emoji: '😂', codes: ['laughing', 'ras', 'tears of joy', 'lol'], category: 'Fețe' },
  { emoji: '🤣', codes: ['rofl', 'rolling', 'ras pe jos'], category: 'Fețe' },
  { emoji: '😃', codes: [':D', 'grinning', 'zambet', 'happy'], category: 'Fețe' },
  { emoji: '😄', codes: [':)', 'smile', 'zambet', 'happy'], category: 'Fețe' },
  { emoji: '😅', codes: ['sweat', 'transpirat', 'nervous'], category: 'Fețe' },
  { emoji: '😆', codes: ['laughing', 'ras', 'happy'], category: 'Fețe' },
  { emoji: '😉', codes: ['wink', 'clip', ';)'], category: 'Fețe' },
  { emoji: '😊', codes: [':)', 'smile', 'zambet', 'happy', 'blushing'], category: 'Fețe' },
  { emoji: '😋', codes: ['yum', 'yummy', 'delicious'], category: 'Fețe' },
  { emoji: '😎', codes: ['cool', 'smug', 'smiling face with sunglasses'], category: 'Fețe' },
  { emoji: '😍', codes: ['heart eyes', 'ochi inima', 'love', 'in love'], category: 'Fețe' },
  { emoji: '🥰', codes: ['love', 'in love', 'hearts'], category: 'Fețe' },
  { emoji: '😘', codes: ['kiss', 'sarut', 'blowing kiss'], category: 'Fețe' },
  { emoji: '🤔', codes: ['thinking', 'gandire', 'hmm'], category: 'Fețe' },
  { emoji: '🤨', codes: ['raised eyebrow', 'suspicious'], category: 'Fețe' },
  { emoji: '😐', codes: ['neutral', 'neutru', 'meh'], category: 'Fețe' },
  { emoji: '😑', codes: ['expressionless', 'fara expresie'], category: 'Fețe' },
  { emoji: '😶', codes: ['no mouth', 'fara gura'], category: 'Fețe' },
  { emoji: '🙄', codes: ['roll eyes', 'ras la ochi', 'eyeroll'], category: 'Fețe' },
  { emoji: '😏', codes: ['smirk', 'zambet superior'], category: 'Fețe' },
  { emoji: '😣', codes: ['persevere', 'perseverent'], category: 'Fețe' },
  { emoji: '😥', codes: ['sad', 'trist', 'disappointed'], category: 'Fețe' },
  { emoji: '😮', codes: ['open mouth', 'surprised', 'surprins'], category: 'Fețe' },
  { emoji: '🤐', codes: ['zipper mouth', 'gura inchisa'], category: 'Fețe' },
  { emoji: '😯', codes: ['hushed', 'surprised'], category: 'Fețe' },
  { emoji: '😪', codes: ['sleepy', 'obosit', 'tired'], category: 'Fețe' },
  { emoji: '😫', codes: ['tired', 'obosit'], category: 'Fețe' },
  { emoji: '🥱', codes: ['yawn', 'cascat'], category: 'Fețe' },
  { emoji: '😴', codes: ['sleeping', 'dormit', 'zzz'], category: 'Fețe' },
  { emoji: '😌', codes: ['relieved', 'relaxat'], category: 'Fețe' },
  { emoji: '😛', codes: ['tongue', 'limba'], category: 'Fețe' },
  { emoji: '😜', codes: ['wink tongue', 'clip limba'], category: 'Fețe' },
  { emoji: '😝', codes: ['squinting tongue', 'limba'], category: 'Fețe' },
  { emoji: '🤤', codes: ['drooling', 'salivat'], category: 'Fețe' },
  { emoji: '😒', codes: ['unamused', 'neamuzat'], category: 'Fețe' },
  { emoji: '😓', codes: ['sweat', 'transpirat'], category: 'Fețe' },
  { emoji: '😔', codes: ['pensive', 'trist'], category: 'Fețe' },
  { emoji: '😕', codes: ['confused', 'confuz'], category: 'Fețe' },
  { emoji: '🙃', codes: ['upside down', 'inversat'], category: 'Fețe' },
  { emoji: '🤑', codes: ['money', 'bani', 'rich'], category: 'Fețe' },
  { emoji: '😲', codes: ['astonished', 'uimit'], category: 'Fețe' },
  { emoji: '☹️', codes: [':(', 'frown', 'trist'], category: 'Fețe' },
  { emoji: '🙁', codes: ['slightly frowning', 'trist'], category: 'Fețe' },
  { emoji: '😖', codes: ['confounded', 'confuz'], category: 'Fețe' },
  { emoji: '😞', codes: ['disappointed', 'dezamagit'], category: 'Fețe' },
  { emoji: '😟', codes: ['worried', 'ingrijorat'], category: 'Fețe' },
  { emoji: '😤', codes: ['triumph', 'triumf'], category: 'Fețe' },
  { emoji: '😢', codes: ['cry', 'plans', 'trist'], category: 'Fețe' },
  { emoji: '😭', codes: ['sob', 'plans tare', 'crying'], category: 'Fețe' },
  { emoji: '😦', codes: ['frowning', 'trist'], category: 'Fețe' },
  { emoji: '😧', codes: ['anguished', 'suferinta'], category: 'Fețe' },
  { emoji: '😨', codes: ['fearful', 'frică'], category: 'Fețe' },
  { emoji: '😩', codes: ['weary', 'obosit'], category: 'Fețe' },
  { emoji: '🤯', codes: ['exploding head', 'cap explodat'], category: 'Fețe' },
  { emoji: '😬', codes: ['grimacing', 'grimas'], category: 'Fețe' },
  { emoji: '😱', codes: ['scream', 'strigat', 'fear'], category: 'Fețe' },
  { emoji: '😳', codes: ['flushed', 'rosu', 'embarrassed'], category: 'Fețe' },
  { emoji: '🥵', codes: ['hot', 'fierbinte'], category: 'Fețe' },
  { emoji: '🥶', codes: ['cold', 'frig'], category: 'Fețe' },
  { emoji: '😰', codes: ['anxious', 'anxios'], category: 'Fețe' },
  { emoji: '😡', codes: ['pouting', 'furios', 'angry'], category: 'Fețe' },
  { emoji: '😠', codes: ['angry', 'furios'], category: 'Fețe' },
  { emoji: '🤬', codes: ['swearing', 'injurat'], category: 'Fețe' },
  { emoji: '😈', codes: ['smiling devil', 'diavol'], category: 'Fețe' },
  { emoji: '👿', codes: ['angry devil', 'diavol'], category: 'Fețe' },
  { emoji: '💀', codes: ['skull', 'craniu'], category: 'Fețe' },
  { emoji: '☠️', codes: ['skull crossbones', 'craniu'], category: 'Fețe' },
  { emoji: '💩', codes: ['poop', 'caca', 'poo'], category: 'Fețe' },
  { emoji: '🤡', codes: ['clown', 'clown'], category: 'Fețe' },
  { emoji: '👹', codes: ['ogre', 'ogre'], category: 'Fețe' },
  { emoji: '👺', codes: ['goblin', 'goblin'], category: 'Fețe' },
  { emoji: '👻', codes: ['ghost', 'fantoma'], category: 'Fețe' },
  { emoji: '👽', codes: ['alien', 'extraterestru'], category: 'Fețe' },
  { emoji: '🤖', codes: ['robot', 'robot'], category: 'Fețe' },
  { emoji: '😺', codes: ['cat smile', 'pisica zambet'], category: 'Fețe' },
  { emoji: '😸', codes: ['cat grin', 'pisica'], category: 'Fețe' },
  { emoji: '😹', codes: ['cat tears', 'pisica plans'], category: 'Fețe' },
  { emoji: '😻', codes: ['cat heart', 'pisica inima'], category: 'Fețe' },
  
  // Natură
  { emoji: '🌲', codes: ['tree', 'copac', 'evergreen'], category: 'Natură' },
  { emoji: '🌳', codes: ['tree', 'copac', 'deciduous'], category: 'Natură' },
  { emoji: '🌴', codes: ['palm', 'palma'], category: 'Natură' },
  { emoji: '🌵', codes: ['cactus', 'cactus'], category: 'Natură' },
  { emoji: '🌾', codes: ['rice', 'orez'], category: 'Natură' },
  { emoji: '🌿', codes: ['herb', 'iarba'], category: 'Natură' },
  { emoji: '☘️', codes: ['shamrock', 'trifoi'], category: 'Natură' },
  { emoji: '🍀', codes: ['four leaf clover', 'trifoi', 'luck'], category: 'Natură' },
  { emoji: '🍁', codes: ['maple leaf', 'frunza'], category: 'Natură' },
  { emoji: '🍂', codes: ['fallen leaf', 'frunza'], category: 'Natură' },
  { emoji: '🍃', codes: ['leaf', 'frunza'], category: 'Natură' },
  { emoji: '🌺', codes: ['hibiscus', 'hibiscus'], category: 'Natură' },
  { emoji: '🌻', codes: ['sunflower', 'floarea soarelui'], category: 'Natură' },
  { emoji: '🌼', codes: ['blossom', 'floare'], category: 'Natură' },
  { emoji: '🌷', codes: ['tulip', 'tulipan'], category: 'Natură' },
  { emoji: '🌹', codes: ['rose', 'trandafir'], category: 'Natură' },
  { emoji: '🥀', codes: ['wilted', 'ofilit'], category: 'Natură' },
  { emoji: '🌸', codes: ['cherry blossom', 'floare cires'], category: 'Natură' },
  { emoji: '💐', codes: ['bouquet', 'buchet'], category: 'Natură' },
  { emoji: '🌈', codes: ['rainbow', 'curcubeu'], category: 'Natură' },
  { emoji: '☀️', codes: ['sun', 'soare'], category: 'Natură' },
  { emoji: '🌤️', codes: ['sun cloud', 'soare nor'], category: 'Natură' },
  { emoji: '⛅', codes: ['cloud sun', 'nor soare'], category: 'Natură' },
  { emoji: '🌥️', codes: ['cloud sun', 'nor soare'], category: 'Natură' },
  { emoji: '☁️', codes: ['cloud', 'nor'], category: 'Natură' },
  { emoji: '🌦️', codes: ['rain sun', 'ploaie soare'], category: 'Natură' },
  { emoji: '🌧️', codes: ['rain', 'ploaie'], category: 'Natură' },
  { emoji: '⛈️', codes: ['thunder', 'tunet', 'storm'], category: 'Natură' },
  { emoji: '🌩️', codes: ['lightning', 'fulger'], category: 'Natură' },
  { emoji: '🌨️', codes: ['snow', 'zapada'], category: 'Natură' },
  { emoji: '❄️', codes: ['snowflake', 'fulg'], category: 'Natură' },
  { emoji: '🌬️', codes: ['wind', 'vant'], category: 'Natură' },
  { emoji: '💨', codes: ['dash', 'vant'], category: 'Natură' },
  { emoji: '🌪️', codes: ['tornado', 'tornada'], category: 'Natură' },
  { emoji: '🌫️', codes: ['fog', 'ceata'], category: 'Natură' },
  { emoji: '⭐', codes: ['star', 'stea'], category: 'Natură' },
  { emoji: '🌟', codes: ['glowing star', 'stea'], category: 'Natură' },
  { emoji: '✨', codes: ['sparkles', 'scantei'], category: 'Natură' },
  { emoji: '💫', codes: ['dizzy', 'stea'], category: 'Natură' },
  { emoji: '🌙', codes: ['moon', 'luna'], category: 'Natură' },
  
  // Mâini
  { emoji: '👋', codes: ['wave', 'salut', 'hello'], category: 'Mâini' },
  { emoji: '🤚', codes: ['raised hand', 'mana'], category: 'Mâini' },
  { emoji: '🖐️', codes: ['hand', 'mana'], category: 'Mâini' },
  { emoji: '✋', codes: ['stop', 'stop'], category: 'Mâini' },
  { emoji: '🖖', codes: ['vulcan', 'spock'], category: 'Mâini' },
  { emoji: '👌', codes: ['ok', 'ok hand'], category: 'Mâini' },
  { emoji: '🤌', codes: ['pinched', 'mana'], category: 'Mâini' },
  { emoji: '🤏', codes: ['pinching', 'mana'], category: 'Mâini' },
  { emoji: '✌️', codes: ['peace', 'victory', 'victorie'], category: 'Mâini' },
  { emoji: '🤞', codes: ['crossed fingers', 'noroc'], category: 'Mâini' },
  { emoji: '🤟', codes: ['love you', 'iubire'], category: 'Mâini' },
  { emoji: '🤘', codes: ['rock on', 'rock'], category: 'Mâini' },
  { emoji: '🤙', codes: ['call me', 'sunete'], category: 'Mâini' },
  { emoji: '👈', codes: ['point left', 'stanga'], category: 'Mâini' },
  { emoji: '👉', codes: ['point right', 'dreapta'], category: 'Mâini' },
  { emoji: '👆', codes: ['point up', 'sus'], category: 'Mâini' },
  { emoji: '🖕', codes: ['middle finger', 'finger'], category: 'Mâini' },
  { emoji: '👇', codes: ['point down', 'jos'], category: 'Mâini' },
  { emoji: '☝️', codes: ['point up', 'sus'], category: 'Mâini' },
  { emoji: '👍', codes: ['thumbs up', 'like', 'bine'], category: 'Mâini' },
  { emoji: '👎', codes: ['thumbs down', 'dislike', 'nu'], category: 'Mâini' },
  { emoji: '✊', codes: ['fist', 'pumn'], category: 'Mâini' },
  { emoji: '👊', codes: ['punch', 'pumn'], category: 'Mâini' },
  { emoji: '🤛', codes: ['fist left', 'pumn'], category: 'Mâini' },
  { emoji: '🤜', codes: ['fist right', 'pumn'], category: 'Mâini' },
  { emoji: '👏', codes: ['clap', 'aplauze'], category: 'Mâini' },
  { emoji: '🙌', codes: ['raise hands', 'bravo'], category: 'Mâini' },
  { emoji: '👐', codes: ['open hands', 'mana'], category: 'Mâini' },
  { emoji: '🤲', codes: ['palms up', 'mana'], category: 'Mâini' },
  { emoji: '🤝', codes: ['handshake', 'strans mana'], category: 'Mâini' },
  { emoji: '🙏', codes: ['pray', 'rugaciune'], category: 'Mâini' },
  { emoji: '💪', codes: ['muscle', 'muschi'], category: 'Mâini' },
  { emoji: '🦾', codes: ['mechanical arm', 'brat'], category: 'Mâini' },
  { emoji: '🦿', codes: ['mechanical leg', 'picior'], category: 'Mâini' },
  { emoji: '🖤', codes: ['black heart', 'inima neagra'], category: 'Mâini' },
  { emoji: '❤️', codes: ['heart', 'inima', 'love', 'iubire'], category: 'Mâini' },
  { emoji: '🧡', codes: ['orange heart', 'inima portocalie'], category: 'Mâini' },
  { emoji: '💛', codes: ['yellow heart', 'inima galbena'], category: 'Mâini' },
  { emoji: '💚', codes: ['green heart', 'inima verde'], category: 'Mâini' },
  { emoji: '💙', codes: ['blue heart', 'inima albastra'], category: 'Mâini' },
  { emoji: '💜', codes: ['purple heart', 'inima mov'], category: 'Mâini' },
  { emoji: '🤎', codes: ['brown heart', 'inima maro'], category: 'Mâini' },
  { emoji: '🤍', codes: ['white heart', 'inima alba'], category: 'Mâini' },
  { emoji: '💯', codes: ['100', 'perfect', 'perfect'], category: 'Mâini' },
  { emoji: '💥', codes: ['explosion', 'explozie'], category: 'Mâini' },
  { emoji: '💦', codes: ['sweat', 'transpirat'], category: 'Mâini' },
  { emoji: '💨', codes: ['dash', 'vant'], category: 'Mâini' },
  { emoji: '🔥', codes: ['fire', 'foc'], category: 'Mâini' },
  { emoji: '⚡', codes: ['lightning', 'fulger'], category: 'Mâini' },
  
  // Altele
  { emoji: '🎉', codes: ['party', 'petrecere', 'celebration'], category: 'Altele' },
  { emoji: '🎊', codes: ['confetti', 'confetti'], category: 'Altele' },
  { emoji: '🎁', codes: ['gift', 'cadou', 'present'], category: 'Altele' },
  { emoji: '🎂', codes: ['cake', 'tort', 'birthday'], category: 'Altele' },
  { emoji: '🎈', codes: ['balloon', 'balon'], category: 'Altele' },
  { emoji: '🏆', codes: ['trophy', 'trofeu'], category: 'Altele' },
  { emoji: '🥇', codes: ['gold medal', 'medalie aur'], category: 'Altele' },
  { emoji: '🥈', codes: ['silver medal', 'medalie argint'], category: 'Altele' },
  { emoji: '🥉', codes: ['bronze medal', 'medalie bronz'], category: 'Altele' },
  { emoji: '🏅', codes: ['medal', 'medalie'], category: 'Altele' },
  { emoji: '⚽', codes: ['soccer', 'fotbal'], category: 'Altele' },
  { emoji: '🏀', codes: ['basketball', 'baschet'], category: 'Altele' },
  { emoji: '🏈', codes: ['football', 'fotbal american'], category: 'Altele' },
  { emoji: '⚾', codes: ['baseball', 'baseball'], category: 'Altele' },
  { emoji: '🎾', codes: ['tennis', 'tenis'], category: 'Altele' },
  { emoji: '🏐', codes: ['volleyball', 'volei'], category: 'Altele' },
  { emoji: '🎯', codes: ['target', 'tinta', 'dart'], category: 'Altele' },
  { emoji: '🎮', codes: ['game', 'joc', 'video game'], category: 'Altele' },
  { emoji: '🕹️', codes: ['joystick', 'joystick'], category: 'Altele' },
  { emoji: '📷', codes: ['camera', 'camera'], category: 'Altele' },
  { emoji: '📸', codes: ['camera flash', 'camera'], category: 'Altele' },
  { emoji: '📹', codes: ['video camera', 'camera video'], category: 'Altele' },
  { emoji: '🎥', codes: ['movie camera', 'camera film'], category: 'Altele' },
  { emoji: '📱', codes: ['phone', 'telefon'], category: 'Altele' },
  { emoji: '💻', codes: ['laptop', 'laptop'], category: 'Altele' },
  { emoji: '⌚', codes: ['watch', 'ceas'], category: 'Altele' },
  { emoji: '📍', codes: ['pin', 'pin', 'location'], category: 'Altele' },
  { emoji: '🗺️', codes: ['map', 'harta'], category: 'Altele' },
  { emoji: '⏰', codes: ['alarm', 'alarma'], category: 'Altele' },
  { emoji: '🔔', codes: ['bell', 'clopot'], category: 'Altele' },
  { emoji: '🔕', codes: ['no bell', 'fara clopot'], category: 'Altele' },
  { emoji: '📢', codes: ['megaphone', 'megafon'], category: 'Altele' },
  { emoji: '📣', codes: ['megaphone', 'megafon'], category: 'Altele' },
  { emoji: '💬', codes: ['speech', 'vorba'], category: 'Altele' },
  { emoji: '💭', codes: ['thought', 'gand'], category: 'Altele' },
  { emoji: '🗯️', codes: ['anger', 'furie'], category: 'Altele' },
  { emoji: '❗', codes: ['exclamation', 'exclamatie'], category: 'Altele' },
  { emoji: '❓', codes: ['question', 'intrebare'], category: 'Altele' },
  { emoji: '💡', codes: ['lightbulb', 'bec', 'idea'], category: 'Altele' },
  { emoji: '📌', codes: ['pin', 'pin'], category: 'Altele' },
  
  // Legacy/Clasice - Smilies vBulletin/Yahoo Messenger style
  { emoji: '😊', codes: [':)', 'smile', 'zambet'], category: 'Legacy' },
  { emoji: '😉', codes: [';)', 'wink', 'clip'], category: 'Legacy' },
  { emoji: '☹️', codes: [':(', 'frown', 'trist'], category: 'Legacy' },
  { emoji: '😛', codes: [':P', ':p', 'tongue', 'limba'], category: 'Legacy' },
  { emoji: '😀', codes: [':D', 'big grin', 'zambet mare'], category: 'Legacy' },
  { emoji: '😎', codes: ['B-)', 'cool', 'smug'], category: 'Legacy' },
  { emoji: '😮', codes: [':O', ':o', 'eek', 'surprins'], category: 'Legacy' },
  { emoji: '😕', codes: [':-/', 'confused', 'confuz'], category: 'Legacy' },
  { emoji: '😍', codes: [';;)', 'batting eyelashes', 'clip ochi'], category: 'Legacy' },
  { emoji: '😊', codes: [':">', 'blushing', 'rosu'], category: 'Legacy' },
  { emoji: '😰', codes: [':S', ':s', 'worried', 'ingrijorat'], category: 'Legacy' },
  { emoji: '😈', codes: ['>:)', 'devil', 'diavol'], category: 'Legacy' },
  { emoji: '🤣', codes: ['=))', 'rolling on the floor', 'ras pe jos'], category: 'Legacy' },
  { emoji: '🙄', codes: ['8-|', 'rolling eyes', 'ras la ochi'], category: 'Legacy' },
  { emoji: '🤤', codes: ['=P~', 'drooling', 'salivat'], category: 'Legacy' },
  { emoji: '🐝', codes: [':bz', 'bee', 'albina'], category: 'Legacy' },
  { emoji: '🤷', codes: ['^#(^', 'it wasnt me', 'nu eu'], category: 'Legacy' },
  { emoji: '👍', codes: [':-bd', 'thumbs up', 'like'], category: 'Legacy' },
  { emoji: '👎', codes: [':-q', 'thumbs down', 'dislike'], category: 'Legacy' },
  { emoji: '🤘', codes: ['\\m/', 'rock on', 'rock'], category: 'Legacy' },
  { emoji: '⏰', codes: [':!!', 'hurry up', 'grabeste'], category: 'Legacy' },
  { emoji: '😵', codes: ['x_x', 'dont want to see', 'nu vreau sa vad'], category: 'Legacy' },
  { emoji: '⏳', codes: [':-w', 'waiting', 'astept'], category: 'Legacy' },
  { emoji: '🤡', codes: [':O)', 'clown', 'clown'], category: 'Legacy' },
  { emoji: '😴', codes: ['8->', 'daydreaming', 'visare'], category: 'Legacy' },
  { emoji: '🤨', codes: ['/:)', 'raised eyebrow', 'sprancene'], category: 'Legacy' },
  { emoji: '💃', codes: ['\\:D/', 'dancing', 'dans'], category: 'Legacy' },
  { emoji: '💔', codes: ['=(', 'broken heart', 'inima franta'], category: 'Legacy' },
  { emoji: '🤥', codes: [':^o', 'liar', 'mincinos'], category: 'Legacy' },
  { emoji: '🏴‍☠️', codes: [':ar!', 'pirate', 'pirat'], category: 'Legacy' },
  { emoji: '🤐', codes: ['[-(', 'not talking', 'nu vorbesc'], category: 'Legacy' },
  { emoji: '⏸️', codes: [':-t', 'time out', 'pauza'], category: 'Legacy' },
  { emoji: '😐', codes: [':|', 'straight face', 'fata dreapta'], category: 'Legacy' },
  { emoji: '🙈', codes: ['[-X', 'shame on you', 'rusine'], category: 'Legacy' },
  { emoji: '😘', codes: [':*', 'kiss', 'sarut'], category: 'Legacy' },
  { emoji: '😵', codes: ['@-)', 'hypnotized', 'hipnotizat'], category: 'Legacy' },
  { emoji: '🤫', codes: [':-$', 'dont tell anyone', 'nu spune'], category: 'Legacy' },
  { emoji: '👋', codes: [':-h', 'wave', 'salut'], category: 'Legacy' },
  { emoji: '😂', codes: [':))', 'laughing', 'ras'], category: 'Legacy' },
  { emoji: '✌️', codes: [':)>-', 'peace sign', 'pace'], category: 'Legacy' },
  { emoji: '😬', codes: [':-SS', 'nailbiting', 'ros unghii'], category: 'Legacy' },
  { emoji: '🤢', codes: [':-&', 'sick', 'bolnav'], category: 'Legacy' },
  { emoji: '😤', codes: ['~X(', 'at wits end', 'la capat'], category: 'Legacy' },
  { emoji: '😭', codes: [':((', 'crying', 'plans'], category: 'Legacy' },
  { emoji: '😓', codes: ['b-(', 'feeling beat up', 'batut'], category: 'Legacy' },
  { emoji: '👏', codes: ['=D>', 'applause', 'aplauze'], category: 'Legacy' },
  { emoji: '😎', codes: ['L-)', 'loser', 'pierzator'], category: 'Legacy' },
  { emoji: '📞', codes: [':-c', 'call me', 'sunete'], category: 'Legacy' },
  { emoji: '😗', codes: [':-"', 'whistling', 'fluierat'], category: 'Legacy' },
  { emoji: '😍', codes: [':x', 'love struck', 'indragostit'], category: 'Legacy' },
  { emoji: '🤦', codes: ['#-o', 'doh', 'doh'], category: 'Legacy' },
  { emoji: '📱', codes: [':)]', 'on the phone', 'telefon'], category: 'Legacy' },
  { emoji: '😅', codes: ['#:-S', 'whew', 'uff'], category: 'Legacy' },
  { emoji: '💰', codes: ['$-)', 'money eyes', 'bani ochi'], category: 'Legacy' },
  { emoji: '🤔', codes: [':-?', 'thinking', 'gandire'], category: 'Legacy' },
  { emoji: '😴', codes: ['I-)', 'sleepy', 'obosit'], category: 'Legacy' },
  { emoji: '😏', codes: [':-j', 'oh go on', 'hai'], category: 'Legacy' },
  { emoji: '🙏', codes: ['[-O<', 'praying', 'rugaciune'], category: 'Legacy' },
  { emoji: '🤗', codes: ['>:D<', 'big hug', 'imbatare'], category: 'Legacy' },
  { emoji: '🖐️', codes: ['=;', 'talk to the hand', 'mana'], category: 'Legacy' },
  { emoji: '🙇', codes: ['^:)^', 'not worthy', 'nu merita'], category: 'Legacy' },
  { emoji: '💡', codes: ['*-:)', 'idea', 'idee'], category: 'Legacy' },
  { emoji: '🥱', codes: ['(:|', 'yawn', 'cascat'], category: 'Legacy' },
  { emoji: '🤓', codes: [':-B', 'nerd', 'tocilar'], category: 'Legacy' },
  { emoji: '💬', codes: [':-@', 'chatterbox', 'vorbaret'], category: 'Legacy' },
  { emoji: '😏', codes: [':>', 'smug', 'superior'], category: 'Legacy' },
  { emoji: '😛', codes: ['>:P', 'phbbbbt', 'phbbbbt'], category: 'Legacy' },
  { emoji: '🎉', codes: ['<:-P', 'party', 'petrecere'], category: 'Legacy' },
  { emoji: '😤', codes: ['%-(', 'not listening', 'nu ascult'], category: 'Legacy' },
  { emoji: '😇', codes: ['O:-)', 'angel', 'inger'], category: 'Legacy' },
  { emoji: '😄', codes: [';))', 'hee hee', 'hee hee'], category: 'Legacy' },
  { emoji: '😡', codes: ['X(', 'angry', 'furios'], category: 'Legacy' },
  { emoji: '😔', codes: [':-<', 'sigh', 'suspin'], category: 'Legacy' },
  { emoji: '😜', codes: ['8-}', 'silly', 'prost'], category: 'Legacy' },
  { emoji: '🤷', codes: [':-??', 'i dont know', 'nu stiu'], category: 'Legacy' },
  { emoji: '😤', codes: ['>:/', 'bring it on', 'hai'], category: 'Legacy' },
  { emoji: '💪', codes: ['[]==[]', 'exercise', 'exercitiu'], category: 'Legacy' },
  { emoji: '😉', codes: [':wink:', 'wink', 'clip'], category: 'Legacy' },
  { emoji: '🎉', codes: ['~^o^~<', 'cheer', 'ura'], category: 'Legacy' },
  { emoji: '👊', codes: [':(fight)', 'fight', 'lupta'], category: 'Legacy' },
  { emoji: '🎣', codes: ['o|:-)', 'catch', 'prins'], category: 'Legacy' },
  { emoji: '😛', codes: [':tongue:', 'tongue', 'limba'], category: 'Legacy' },
  { emoji: '😞', codes: ['%*-{', 'down on luck', 'ghinion'], category: 'Legacy' },
  { emoji: '🎤', codes: ['o|\\~', 'sing', 'canta'], category: 'Legacy' },
  { emoji: '😊', codes: [':smile:', 'smile', 'zambet'], category: 'Legacy' },
  { emoji: '😞', codes: ['>%||:-{', 'unlucky', 'neghinion'], category: 'Legacy' },
  { emoji: '🤮', codes: [':puke!', 'vomit', 'voma'], category: 'Legacy' },
  { emoji: '🙄', codes: [':rolleyes:', 'rolleyes', 'ras ochi'], category: 'Legacy' },
  { emoji: '🎁', codes: ['&[]', 'gift', 'cadou'], category: 'Legacy' },
  { emoji: '🎵', codes: ['o|^_^|o', 'music', 'muzica'], category: 'Legacy' },
  { emoji: '😊', codes: [':redface:', 'redface', 'rosu'], category: 'Legacy' },
  { emoji: '📺', codes: [':(tv)', 'tv', 'televizor'], category: 'Legacy' },
  { emoji: '🔥', codes: [':::^^:::', 'hot', 'fierbinte'], category: 'Legacy' },
  { emoji: '😡', codes: [':mad:', 'mad', 'furios'], category: 'Legacy' },
  { emoji: '📚', codes: ['?@_@?', 'studying', 'studiu'], category: 'Legacy' },
  { emoji: '🥶', codes: ["'+_+", 'cold', 'frig'], category: 'Legacy' },
  { emoji: '☹️', codes: [':frown:', 'frown', 'trist'], category: 'Legacy' },
  { emoji: '👻', codes: [':->~~', 'spooky', 'infricosator'], category: 'Legacy' },
  { emoji: '😔', codes: [':-(||>', 'give up', 'renuntat'], category: 'Legacy' },
  { emoji: '😮', codes: [':eek:', 'eek', 'surprins'], category: 'Legacy' },
  { emoji: '🔍', codes: ['@-@', 'search me', 'cauta'], category: 'Legacy' },
  { emoji: '🍽️', codes: ['^o^||3', 'eat', 'mananca'], category: 'Legacy' },
  { emoji: '😎', codes: [':cool:', 'cool', 'cool'], category: 'Legacy' },
  { emoji: '🎮', codes: [':(game)', 'gaming', 'joc'], category: 'Legacy' },
  { emoji: '👨‍🍳', codes: ['[]---', 'cook', 'gateste'], category: 'Legacy' },
  { emoji: '😕', codes: [':confused:', 'confused', 'confuz'], category: 'Legacy' },
  { emoji: '🙌', codes: [':-)/\\:-)', 'high five', 'bate palma'], category: 'Legacy' },
  { emoji: '😵', codes: ["'@^@|||", 'dizzy', 'amețit'], category: 'Legacy' },
  { emoji: '😀', codes: [':biggrin:', 'biggrin', 'zambet mare'], category: 'Legacy' },
  { emoji: '🤠', codes: ['<):)', 'cowboy', 'cowboy'], category: 'Legacy' },
  { emoji: '💀', codes: ['8-X', 'skull', 'craniu'], category: 'Legacy' },
  { emoji: '🤖', codes: ['[..]', 'transformer', 'transformer'], category: 'Legacy' },
  { emoji: '☕', codes: ['~O)', 'coffee', 'cafea'], category: 'Legacy' },
  { emoji: '🐶', codes: [':o3', 'puppy dog eyes', 'ochi caine'], category: 'Legacy' },
  { emoji: '🎃', codes: ['(~~)', 'pumpkin', 'dovleac'], category: 'Legacy' },
  { emoji: '⭐', codes: ['(*)', 'star', 'stea'], category: 'Legacy' },
  { emoji: '🏳️', codes: ['**==', 'flag', 'steag'], category: 'Legacy' },
  { emoji: '☯️', codes: ['(%)', 'yin yang', 'yin yang'], category: 'Legacy' },
  { emoji: '🍀', codes: ['%%-', 'good luck', 'noroc'], category: 'Legacy' },
  { emoji: '🌷', codes: ['o-+', 'april', 'aprilie'], category: 'Legacy' },
  { emoji: '🌹', codes: ['@};-', 'rose', 'trandafir'], category: 'Legacy' },
  { emoji: '👤', codes: ['o=>', 'billy', 'billy'], category: 'Legacy' },
  { emoji: '🐔', codes: ['~:>', 'chicken', 'gain'], category: 'Legacy' },
  { emoji: '👤', codes: ['o->', 'hiro', 'hiro'], category: 'Legacy' },
  { emoji: '🐵', codes: [':(|)', 'monkey', 'maimuta'], category: 'Legacy' },
  { emoji: '😤', codes: [':-L', 'frustrated', 'frustrat'], category: 'Legacy' },
  { emoji: '🐄', codes: ['3:-O', 'cow', 'vaca'], category: 'Legacy' },
  { emoji: '👽', codes: ['>-)', 'alien', 'extraterestru'], category: 'Legacy' },
  { emoji: '🐷', codes: [':@)', 'pig', 'porc'], category: 'Legacy' },
  { emoji: '🐛', codes: ['=:)', 'bug', 'gandac'], category: 'Legacy' },
];

// Grupează emoji-urile pe categorii
const emojiCategories: Record<string, EmojiData[]> = {
  'Pescuit': emojiData.filter(e => e.category === 'Pescuit'),
  'Fețe': emojiData.filter(e => e.category === 'Fețe'),
  'Natură': emojiData.filter(e => e.category === 'Natură'),
  'Mâini': emojiData.filter(e => e.category === 'Mâini'),
  'Altele': emojiData.filter(e => e.category === 'Altele'),
  'Legacy': emojiData.filter(e => e.category === 'Legacy'),
};

const categoryIcons: Record<string, string> = {
  'Pescuit': '🎣',
  'Fețe': '😊',
  'Natură': '🌿',
  'Mâini': '👋',
  'Altele': '🎉',
  'Legacy': '😀',
};

export default function EmojiPicker({ isOpen, onClose, onSelect, anchorRef }: EmojiPickerProps) {
  const { theme } = useTheme();
  const [activeCategory, setActiveCategory] = useState<string>('Pescuit');
  const [searchTerm, setSearchTerm] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculează și actualizează poziția la scroll
  const updatePosition = () => {
    if (isOpen && anchorRef?.current && pickerRef.current) {
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const pickerHeight = 400;
      const pickerWidth = 480;
      
      const spaceBelow = window.innerHeight - anchorRect.bottom;
      const spaceAbove = anchorRect.top;
      
      let top: number;
      if (spaceBelow >= pickerHeight || spaceBelow > spaceAbove) {
        top = anchorRect.bottom + 4;
      } else {
        top = anchorRect.top - pickerHeight - 4;
      }
      
      let left = anchorRect.left;
      if (left + pickerWidth > window.innerWidth) {
        left = window.innerWidth - pickerWidth - 8;
      }
      
      setPosition({ top, left });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, anchorRef]);

  // Închide la click în afară
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Închide la Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filtrare emoji după search
  const filteredEmojis = searchTerm
    ? emojiData.filter(emojiData => 
        emojiData.codes.some(code => 
          code.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : emojiCategories[activeCategory] || [];

  const categoryKeys = Object.keys(emojiCategories);

  return (
    <div
      ref={pickerRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: '420px',
        maxHeight: '380px',
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: '0.75rem',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn 0.15s ease-out',
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        /* Stilizare scrollbar - doar vertical */
        .emoji-picker-scroll::-webkit-scrollbar {
          width: 8px;
          height: 0;
        }
        .emoji-picker-scroll::-webkit-scrollbar-track {
          background: ${theme.background};
          border-radius: 4px;
        }
        .emoji-picker-scroll::-webkit-scrollbar-thumb {
          background: ${theme.border};
          border-radius: 4px;
        }
        .emoji-picker-scroll::-webkit-scrollbar-thumb:hover {
          background: ${theme.primary};
        }
        /* Ascunde scrollbar-ul orizontal complet */
        .emoji-picker-scroll {
          overflow-x: hidden !important;
          scrollbar-width: thin;
          scrollbar-color: ${theme.border} ${theme.background};
        }
      `}</style>

      {/* Header cu search */}
      <div style={{ 
        padding: '0.5rem', 
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <input
          type="text"
          placeholder="Caută emoji (ex: smile, zambet, :)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '0.375rem 0.5rem',
            border: `1px solid ${theme.border}`,
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            backgroundColor: theme.background,
            color: theme.text,
            outline: 'none'
          }}
        />
        <button
          onClick={onClose}
          style={{
            padding: '0.25rem',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            color: theme.textSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Categorii tabs */}
      {!searchTerm && (
        <div style={{ 
          display: 'flex', 
          gap: '0.125rem', 
          padding: '0.375rem 0.5rem',
          borderBottom: `1px solid ${theme.border}`,
          overflowX: 'auto',
          overflowY: 'hidden'
        }}>
          {categoryKeys.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              title={category}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.375rem 0.5rem',
                fontSize: '0.7rem',
                backgroundColor: activeCategory === category ? `${theme.primary}20` : 'transparent',
                color: activeCategory === category ? theme.primary : theme.textSecondary,
                border: activeCategory === category ? `1px solid ${theme.primary}` : `1px solid transparent`,
                borderRadius: '0.375rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                fontWeight: activeCategory === category ? '600' : '400'
              }}
              onMouseEnter={(e) => {
                if (activeCategory !== category) {
                  e.currentTarget.style.backgroundColor = theme.surfaceHover;
                  e.currentTarget.style.borderColor = theme.border;
                }
              }}
              onMouseLeave={(e) => {
                if (activeCategory !== category) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '1rem' }}>{categoryIcons[category]}</span>
              <span>{category}</span>
            </button>
          ))}
        </div>
      )}

      {/* Grid de emoji */}
      <div 
        className="emoji-picker-scroll"
        style={{ 
          flex: 1, 
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '0.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          gap: '0.25rem',
          alignContent: 'start',
          width: '100%',
          boxSizing: 'border-box',
          willChange: 'scroll-position',
          transform: 'translateZ(0)',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {filteredEmojis.map((emojiData, index) => {
          // Pentru categoria Legacy, afișăm emoji-ul original, dar inserăm codul text
          const isLegacy = emojiData.category === 'Legacy';
          const displayText = emojiData.emoji; // Întotdeauna afișăm emoji-ul
          const insertText = isLegacy ? emojiData.codes[0] : emojiData.emoji; // Inserăm codul pentru Legacy
          
          return (
            <button
              key={`${emojiData.emoji}-${index}`}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Prevenim propagarea evenimentului - folosim nativeEvent
                const nativeEvent = e.nativeEvent as Event;
                if (nativeEvent && typeof nativeEvent.stopImmediatePropagation === 'function') {
                  nativeEvent.stopImmediatePropagation();
                }
                onSelect(insertText);
                // Nu închidem picker-ul imediat - lasă utilizatorul să selecteze mai multe
                // onClose();
              }}
              title={isLegacy ? `${emojiData.codes[0]} (${emojiData.codes.join(', ')})` : emojiData.codes.join(', ')}
              style={{
                padding: '0.375rem',
                fontSize: '1.25rem',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                transition: 'background-color 0.1s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                verticalAlign: 'middle',
                lineHeight: '1',
                minWidth: '2rem',
                minHeight: '2rem',
                willChange: 'background-color',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.surfaceHover;
                e.currentTarget.style.transform = 'translateZ(0) scale(1.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'translateZ(0) scale(1)';
              }}
            >
              {displayText}
            </button>
          );
        })}
        {filteredEmojis.length === 0 && (
          <div style={{ 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '1rem',
            color: theme.textSecondary,
            fontSize: '0.8rem'
          }}>
            Niciun emoji găsit
          </div>
        )}
      </div>
    </div>
  );
}
