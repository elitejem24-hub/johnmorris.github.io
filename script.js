    // JavaScript (often shortened to JS) adds behavior to the HTML page. A variable is a named place to keep a value: const names a value that will not be reassigned, while let names one that can change.
    // The DOM (Document Object Model) is the browser's in-memory tree of HTML elements. querySelector finds an element in that tree so the game can update it.
    (() => {
      // The canvas is the drawing surface. Its 2D context (ctx) is the set of drawing tools used for the player, ground, and hazards.
      const canvas=document.querySelector('#scene'),ctx=canvas.getContext('2d');
      // These references connect game code to messages, popups, and score displays in index.html.
      const message=document.querySelector('#message'),finish=document.querySelector('#finish'),quiz=document.querySelector('#quiz'),deathPanel=document.querySelector('#death'),talk=document.querySelector('#talk');
      const quizQuestion=document.querySelector('#quiz-question'),quizTag=document.querySelector('#quiz-tag');
      const deathCopy=document.querySelector('#death-copy'),talkTitle=document.querySelector('#talk-title'),talkCopy=document.querySelector('#talk-copy'),talkActions=document.querySelector('#talk-actions'),talkClose=document.querySelector('#talk-close');
      const fallsEl=document.querySelector('#falls'),distanceEl=document.querySelector('#distance'),meter=document.querySelector('#meter'),bestDistanceEl=document.querySelector('#best-distance');
      // Main game settings and the four current button/keyboard states.
      let worldLength=3000,levelIndex=0,gravity=2050,runSpeed=300,jumpSpeed=700;
      const input={left:false,right:false,jump:false,crouch:false};
      // Helper functions return a random number or shuffle a copied list without changing the original list.
      const random=(min,max)=>min+Math.random()*(max-min);
      const shuffled=items=>{const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;};
      // Each level is an object (a group of named values). Arrays inside it list the ground sections, stepping stones, traps, question, and signs.
      const levels=[
        {length:3000,speed:285,terrain:[[0,430,0],[510,900,-30],[980,1400,0],[1490,1950,-35],[2040,3000,0]],stones:[[1415,-28],[1455,-58]],movingStones:false,traps:[
          {kind:'fakeFloor',x:650,width:76},{kind:'press',x:820},{kind:'spikes',x:1580,width:70},{kind:'falseExit',x:2240}
        ],question:{x:1010,text:'A group of flamingos is called a flamboyance.',answer:true,correct:'True. The flamingos hired a very good publicist.'},signs:[[310,'NICE PACE. FOR A ROCK.'],[910,'THE FLOOR IS VERY TRUSTWORTHY.'],[1860,'YOU LOOK CONFIDENT. WHY?']]},
        {length:3650,speed:300,terrain:[[0,480,0],[570,1030,-40],[1120,1560,0],[1650,2030,-55],[2360,2780,0],[2870,3280,-35],[3370,3650,0]],stones:[[2070,-28],[2145,-70],[2225,-46],[2305,-18]],movingStones:true,traps:[
          {kind:'ceiling',x:1310,width:130},{kind:'boulder',x:1780},{kind:'arrows',x:1900},{kind:'oneWay',x:2510,width:74},{kind:'wind',x:2660,width:170},{kind:'fakeCheckpoint',x:3190}
        ],question:{x:1160,text:'Bananas grow on trees.',answer:false,correct:'False. The banana plant is technically a giant herb.'},signs:[[360,'LEVEL TWO. SAME YOU.'],[1510,'DUCKING IS A PERSONALITY NOW.'],[2730,'THE EXIT IS DEFINITELY THIS WAY.']]},
        {length:4750,speed:315,terrain:[[0,470,0],[560,1000,-42],[1090,1550,0],[1640,2050,-55],[2140,2680,0],[2770,3160,-38],[3250,3650,0],[4050,4750,-25]],stones:[[3700,-30],[3770,-70],[3845,-42],[3920,-16]],movingStones:true,traps:[
          {kind:'fakeFloor',x:720,width:90},{kind:'press',x:1190},{kind:'echoJump',x:2280,width:130},{kind:'wind',x:2930,width:200},{kind:'oneWay',x:3410,width:85},{kind:'boulder',x:4160},{kind:'falseExit',x:4430}
        ],question:{x:1105,text:'True or false: this sentence has no correct answer.',answer:false,correct:'False. You have discovered the loophole. Enjoy the checkpoint.'},signs:[[330,'LEVEL THREE. YOUR THUMB LOOKS TIRED.'],[1580,'YOU ARE DOING GREAT. (UNVERIFIED)'],[2700,'THAT JUMP WAS ALMOST A JUMP.'],[4300,'SO CLOSE. PROBABLY.']]}
      ];
      // localStorage is a small browser-owned key/value store: it keeps this player's records on this device, without an account or server.
      // This key names the saved record. JSON is a text format used here to turn the list of level records into text and back again.
      const bestStorageKey='one-more-step-best-distance-v1';
      function loadBestDistances() {
        // Start with zero for each level, then safely replace those values with valid saved percentages when available.
        const empty=levels.map(()=>0);
        try {
          const saved=JSON.parse(localStorage.getItem(bestStorageKey)||'null');
          if(!Array.isArray(saved))return empty;
          return empty.map((_,i)=>Number.isInteger(saved[i])&&saved[i]>=0&&saved[i]<=100?saved[i]:0);
        } catch { return empty; }
      }
      let bestDistances=loadBestDistances();
      // True/false questions are kept in one list so a run can draw from the same collection.
      const questionBank=[
        {id:'flamingo',text:'A group of flamingos is called a flamboyance.',answer:true,correct:'True. The flamingos hired a very good publicist.'},
        {id:'banana-berry',text:'Botanically speaking, a banana is a berry.',answer:true,correct:'True. Fruit classification remains deeply unserious.'},
        {id:'strawberry-berry',text:'A strawberry is a botanical berry.',answer:false,correct:'False. The strawberry has been mislabeling itself.'},
        {id:'wombat',text:'Wombats make cube-shaped poop.',answer:true,correct:'True. Nature invented tiny bathroom bricks.'},
        {id:'octopus',text:'An octopus has three hearts.',answer:true,correct:'True. One heart was apparently not dramatic enough.'},
        {id:'venus',text:'A day on Venus is longer than its year.',answer:true,correct:'True. Venus has a very relaxed calendar.'},
        {id:'lightning',text:'Lightning can be hotter than the surface of the Sun.',answer:true,correct:'True. The sky occasionally overdoes it.'},
        {id:'butterfly',text:'Butterflies taste with their feet.',answer:true,correct:'True. Imagine reviewing lunch by standing on it.'},
        {id:'penguin',text:'Penguins have knees.',answer:true,correct:'True. They keep them under the outfit.'},
        {id:'bat',text:'Bats are blind.',answer:false,correct:'False. Bats can see; echolocation is just an extra feature.'},
        {id:'goldfish',text:'A goldfish only remembers things for three seconds.',answer:false,correct:'False. The goldfish remembers this insult.'},
        {id:'moon-wall',text:'You can see the Great Wall of China from the Moon with your naked eye.',answer:false,correct:'False. The Moon is not a sightseeing balcony.'},
        {id:'camel',text:'A camel stores water in its hump.',answer:false,correct:'False. The hump stores fat. Camel rumors are out of control.'},
        {id:'pineapple',text:'Pineapples grow on trees.',answer:false,correct:'False. They grow close to the ground on a plant.'},
        {id:'sharks',text:'Sharks existed before trees.',answer:true,correct:'True. Sharks are extremely committed to being old.'},
        {id:'otters',text:'Sea otters sometimes hold paws while resting in water.',answer:true,correct:'True. The ocean is apparently a group project.'},
        {id:'ostrich',text:'An ostrich eye is larger than its brain.',answer:true,correct:'True. The eye is doing a lot of the heavy lifting.'},
        {id:'lightning-repeat',text:'Lightning never strikes the same place twice.',answer:false,correct:'False. Lightning has favorite places.'},
        {id:'water-drain',text:'Water always drains the opposite way around in the other hemisphere.',answer:false,correct:'False. Your sink is not that powerful.'},
        {id:'sound-water',text:'Sound travels faster through water than through air.',answer:true,correct:'True. Water carries gossip efficiently.'},
        {id:'dolphin-sleep',text:'Dolphins can rest one half of their brain at a time.',answer:true,correct:'True. Multitasking, but make it aquatic.'},
        {id:'crocodile-tongue',text:'A crocodile cannot stick out its tongue.',answer:true,correct:'True. Finally, a creature with better manners.'},
        {id:'cat-purr',text:'Cats only purr when they are happy.',answer:false,correct:'False. Cats purr for several reasons, including self-soothing.'},
        {id:'human-senses',text:'Humans have exactly five senses.',answer:false,correct:'False. There are more, including balance and temperature.'},
        {id:'owl-eyes',text:'An owl can move its eyes around inside its head.',answer:false,correct:'False. The eyes are fixed; the neck does the work.'},
        {id:'kangaroo',text:'Kangaroos can walk backward easily.',answer:false,correct:'False. Their build makes backing up very difficult.'},
        {id:'honey',text:'Honey can stay edible for an extremely long time when sealed.',answer:true,correct:'True. Honey is the pantry item with commitment.'},
        {id:'clouds',text:'A cloud has no weight because it floats.',answer:false,correct:'False. Clouds can weigh a lot; they just spread it out.'},
        {id:'blue-whales',text:'The blue whale is the largest animal known to have lived on Earth.',answer:true,correct:'True. The ocean has a very large champion.'},
        {id:'spiders-sleep',text:'People regularly swallow several spiders in their sleep each year.',answer:false,correct:'False. That is a made-up bedtime horror story.'}
      ];
      // A Set remembers question IDs already used so a question is not repeated in the current run.
      const usedQuestionIds=new Set();
      function drawQuestion() {
        // Pick an unused trivia question; after the list is exhausted, create a fresh even/odd question.
        const unused=questionBank.filter(q=>!usedQuestionIds.has(q.id));
        if(unused.length) { const q=unused[Math.floor(Math.random()*unused.length)];usedQuestionIds.add(q.id);return {...q}; }
        let n=1001+Math.floor(Math.random()*1000000000),id=`number-${n}`;
        while(usedQuestionIds.has(id)) { n=1001+Math.floor(Math.random()*1000000000);id=`number-${n}`; }
        const answer=n%2===0;
        const q={id,text:`True or false: ${n} is an even number.`,answer,correct:answer?'True. Numbers remain committed to their bit.':'False. Even the number is trying to trip you.'};
        usedQuestionIds.add(q.id);return q;
      }
      // These values track screen size, camera position, game progress, popup state, and animation timers.
      let width=900,height=420,dpr=1,last=0,camera=0,falls=0,won=false,flash=0,walkTime=0,effectTimer=0,effectType='',quizActive=false,talkActive=false,quizIndex=0,checkpointX=72,checkpointY=0;
      // These arrays hold the current run's player, traps, platforms, scenery, and interactable characters.
      let player,traps=[],stones=[],currentQuestions=[],currentSigns=[],scenery=[],activeTerrain=[],checkpointQuestionX=1000,trees=[],npcs=[],returnToStart=false,pendingInteraction=null;
      // The floor's default vertical position is calculated from the canvas height so it adapts to screen size.
      const floorY=()=>height*.72;
      function trapWidth(kind) {
        // Return a random width appropriate to the selected trap type.
        const ranges={fakeFloor:[68,104],gap:[72,112],press:[58,76],spikes:[54,82],falseExit:[46,46],ceiling:[88,124],boulder:[38,48],arrows:[54,82],oneWay:[62,92],wind:[110,145],fakeCheckpoint:[24,24],echoJump:[90,130]};
        const [a,b]=ranges[kind]||[0,0];return a===b?a:Math.round(random(a,b));
      }

      function createRun() {
        // Build a fresh variation of the selected level while keeping its jumps and gaps within the intended layout.
        const data=levels[levelIndex],scale=[1.34,1.36,1.38][levelIndex];worldLength=Math.round(data.length*scale);runSpeed=data.speed;
        activeTerrain=data.terrain.map(([a,b,dy],i)=>{const edge=i===0||i===data.terrain.length-1,shift=edge?0:random(-44,44),heightJitter=edge?0:random(-10,10);return [a*scale+shift,b*scale+shift,dy+heightJitter];});
        const types=shuffled(data.traps.map(t=>t.kind)),positions=data.traps.map(t=>t.x*scale).sort((a,b)=>a-b);
        traps=positions.map((position,i)=>{
          const kind=types[i],width=trapWidth(kind),desired=position+random(-132,132);
          const segment=activeTerrain.reduce((best,s)=>{
            const lo=s[0]+24,hi=s[1]-width-24;const point=Math.max(lo,Math.min(hi,desired));
            return !best||Math.abs(point-desired)<Math.abs(best.x-desired)?{x:point}:best;
          },null);
          return {kind,x:segment?segment.x:desired,width,triggered:false,delay:random(.16,.27),activated:false,age:0,projectiles:[],used:false};
        });
        const fy=floorY();stones=data.stones.map(([x,dy],i)=>({x:x*scale+random(-10,10),y:fy+dy,originY:fy+dy,w:i%2?38:40,h:16,falling:false,vy:0,wait:0,phase:i*1.7,moving:data.movingStones,moveBase:x*scale+random(-10,10)}));
        const qTarget=data.question.x*scale+random(-36,36),qPlatform=activeTerrain.reduce((best,s)=>{const point=Math.max(s[0]+50,Math.min(s[1]-75,qTarget));return !best||Math.abs(point-qTarget)<Math.abs(best.x-qTarget)?{x:point}:best;},null);
        checkpointQuestionX=qPlatform.x;
        currentSigns=data.signs.map(([x,text])=>[x*scale+random(-55,55),text]);
        scenery=[];for(let x=100+random(0,70);x<data.length;x+=random(150,330))scenery.push({x,height:25+random(0,58),spread:10+random(0,18),tree:Math.random()>.35});
        scenery=scenery.map(item=>({...item,x:item.x*scale}));
        trees=[];npcs=[];
        const openSegments=shuffled(activeTerrain.filter(s=>s[1]-s[0]>320));
        const placeOnSegment=segment=>Math.max(segment[0]+55,Math.min(segment[1]-55,random(segment[0]+70,segment[1]-70)));
        if(openSegments.length&&Math.random()<.36){const segment=openSegments.pop();trees.push({x:placeOnSegment(segment),used:false,scale:random(.8,1.25)});}
        if(openSegments.length&&Math.random()<.34){const segment=openSegments.pop();npcs.push({x:placeOnSegment(segment),type:shuffled(['helper','puncher','liar','drinker'])[0],used:false,punchTime:0,punched:false});}
      }
      function reset(full=true) {
        // A full reset creates a new run; a checkpoint reset keeps this run's map but restores traps and stepping stones.
        resetInteractions();
        if(full) { falls=0;quizIndex=0;checkpointX=72;checkpointY=floorY()-52; }
        if(full) { createRun();currentQuestions=[{...drawQuestion(),x:checkpointQuestionX}]; }
        else {
          for(const t of traps) { t.triggered=false;t.wait=0;t.activated=false;t.age=0;t.projectiles=[];t.used=false;delete t.pressY;delete t.boulderX;delete t.open;delete t.bounced;delete t.direction;delete t.force;delete t.echoTimer; }
          for(const s of stones) { s.x=s.moveBase;s.y=s.originY;s.falling=false;s.vy=0;s.wait=0; }
        }
        player={x:full?72:checkpointX,y:0,vx:0,vy:0,w:22,h:52,onGround:false,dead:false,support:null,crouching:false,shield:false,invuln:0,dizzy:0};
        player.y=full?floorY()-player.h:checkpointY;player.onGround=true;
        camera=Math.max(0,player.x-width*.3);won=false;flash=0;walkTime=0;effectTimer=0;effectType='';returnToStart=false;
        quizActive=false;talkActive=false;pendingInteraction=null;talk.classList.remove('show');quiz.classList.remove('show');
        input.left=false;input.right=false;input.jump=false;input.crouch=false;
        finish.classList.remove('show');deathPanel.classList.remove('show');fallsEl.textContent=falls;distanceEl.textContent='0%';meter.style.width='0%';bestDistanceEl.textContent=bestDistances[levelIndex]+'%';
        document.querySelector('#level-badge').textContent=`Level ${levelIndex+1} / ${levels.length}`;
        document.querySelector('#level-heading').textContent=`Level no. 0${levelIndex+1}`;
        say(full?'Move, jump, and crouch through the corridor.':'Back to your last checkpoint. The traps have reset.');
      }
      // Put safe plain text into the status line; textContent displays text without treating it as HTML code.
      function say(text) { message.textContent=text; }
      function terrain() {
        // Convert the level's ground coordinates into rectangles that the game can draw and collide with.
        return activeTerrain.map(([x,end,dy])=>({x,w:end-x,y:floorY()+dy,kind:'ground'}));
      }
      function getPlatforms() {
        // Build the surfaces the player can stand on, cutting away any floor that a trap has opened.
        const platforms=[];
        for(const base of terrain()) {
          let pieces=[{x:base.x,w:base.w,y:base.y,kind:'ground'}];
          for(const t of traps) if(t.activated&&(t.kind==='gap'||t.kind==='fakeFloor'||(t.kind==='oneWay'&&t.open))) {
            const next=[];
            for(const p of pieces) {
              const a=Math.max(p.x,t.x),b=Math.min(p.x+p.w,t.x+t.width);
              if(a>=b)next.push(p);
              else { if(a>p.x)next.push({...p,w:a-p.x});if(b<p.x+p.w)next.push({...p,x:b,w:p.x+p.w-b}); }
            }
            pieces=next;
          }
          platforms.push(...pieces.map(p=>({...p,h:height-p.y,bottom:height})));
        }
        platforms.push(...stones.filter(s=>s.y<height+30).map(s=>({...s,kind:'stone',bottom:s.y+s.h,falling:s.falling})));
        return platforms;
      }
      function activateTraps(dt) {
        // Start nearby traps and count down their short activation delay. dt is the time since the previous animation frame.
        for(const t of traps) {
          if(!t.triggered&&player.x+player.w>=t.x) { t.triggered=true;t.wait=t.delay; }
          if(t.triggered&&!t.activated) {
            t.wait-=dt;
            if(t.wait<=0) { t.activated=true;t.age=0;flash=.13;if(t.kind==='arrows')t.nextShot=0; }
          }
        }
      }
      function die(reason='The floor left. You did not.',toStart=false) {
        // Freeze the player and show the death panel until the player chooses to retry.
        if(player.dead)return;
        resetInteractions();
        player.dead=true;returnToStart=toStart;falls++;fallsEl.textContent=falls;
        input.left=false;input.right=false;input.jump=false;input.crouch=false;
        deathCopy.textContent=reason;deathPanel.classList.add('show');say(toStart?'Back to the beginning. The level wanted to see you again.':'Take your time. The floor has already stopped helping.');
      }
      // A shield blocks one ordinary hazard hit; without one, use the normal death flow.
      function hurt(reason) { if(player.shield){player.shield=false;player.invuln=.9;say('Your helpful friend took the hit. They look oddly pleased.');return;}die(reason); }
      function fallTaunt() {
        // Choose a joke that matches the trap or stepping stone the player just fell from.
        const trap=traps.find(t=>t.activated&&player.x+player.w>t.x&&player.x<t.x+t.width&&(t.kind==='fakeFloor'||t.kind==='oneWay'));
        if(trap?.kind==='fakeFloor')return 'You fell for the fake floor. Literally. It was a floor with trust issues.';
        if(trap?.kind==='oneWay')return 'You chose the one-way floor. It chose a one-way trip.';
        if(traps.some(t=>t.activated&&t.kind==='wind'&&player.x+player.w>t.x-40&&player.x<t.x+t.width+40))return 'The wind pushed you off. The wind has no arms and still won.';
        if(traps.some(t=>t.activated&&t.kind==='echoJump'&&player.x+player.w>t.x-35&&player.x<t.x+t.width+35))return 'The delayed jump arrived. Your landing did not.';
        if(stones.some(s=>s.falling&&player.x+player.w>s.x&&player.x<s.x+s.w))return 'That stepping stone had a very short career. You trusted it anyway.';
        return 'You tried to cross a chasm on confidence alone. Confidence was not load-bearing.';
      }
      // Check whether two rectangles overlap; this is the basic collision check for hazards.
      function overlap(a,b) { return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y; }
      function askCheckpoint(question) {
        // Show the true/false question when the player reaches a real checkpoint.
        quizActive=true;quizQuestion.textContent=question.text;quizTag.textContent=`Checkpoint ${quizIndex+1} of ${currentQuestions.length}`;quiz.classList.add('show');
      }
      function answerCheckpoint(value) {
        // Compare the selected answer with the correct one, then save the checkpoint or restart the level.
        const q=currentQuestions[quizIndex];quiz.classList.remove('show');quizActive=false;
        if(value===q.answer) {
          checkpointX=player.x;checkpointY=surfaceAt(player.x)-52;player.h=52;player.crouching=false;input.crouch=false;player.y=checkpointY;player.vy=0;player.onGround=true;quizIndex++;
          say(q.correct);
        } else {
          die('Wrong answer. The checkpoint has sent you back to the beginning for remedial thinking.',true);
        }
      }
      function findNearbyInteractable() {
        // Find a nearby unused character, tree, fake door, or fake flag that should open a choice popup.
        const nearby=items=>items.find(item=>!item.used&&Math.abs(item.x-player.x)<48&&Math.abs(surfaceAt(item.x)-(player.y+player.h))<85);
        const fakeMarkers=traps.filter(item=>item.kind==='falseExit'||item.kind==='fakeCheckpoint');
        return nearby(npcs)||nearby(trees)||nearby(fakeMarkers);
      }
      function resetInteractions() {
        // Make interactables available again after a death or restart.
        for(const item of [...trees,...npcs]){item.used=false;if('punchTime' in item){item.punchTime=0;item.punched=false;item.punchFatal=false;}}
        for(const item of traps)if(item.kind==='falseExit'||item.kind==='fakeCheckpoint')item.used=false;
        pendingInteraction=null;talkActive=false;if(talk){talk.classList.remove('show');talkActions.replaceChildren();talkClose.hidden=true;}
      }
      function interact(target) {
        // Pause the run and show the choices belonging to the object the player walked up to.
        if(player.dead||won||quizActive||talkActive)return;
        target=target||findNearbyInteractable();
        if(!target)return;
        target.used=true;
        pendingInteraction=target;talkActive=true;
        if(target.kind==='falseExit')showChoice('THE FAKE EXIT.','A door with no wall behind it. Somehow it still expects you to make a decision.',[['Try the door','try'],['Walk past','leave']]);
        else if(target.kind==='fakeCheckpoint')showChoice('OFFICIAL-LOOKING FLAG.','It says checkpoint. It has the confidence of a real checkpoint and none of the functionality.',[['Claim it','claim'],['Keep moving','leave']]);
        else if(trees.includes(target))showChoice('A TREE HAS OPTIONS.','This tree offers shade and suspiciously crunchy fruit. Nature has learned menu design.',[['Rest here','rest'],['Shake the branches','shake']]);
        else if(target.type==='helper')showChoice('A HELPFUL STRANGER.','They offer a lucky charm. The stick figure seems sincere. Suspicious.',[['Take the charm','charm'],['Decline politely','leave']]);
        else if(target.type==='puncher')showChoice('A QUICK HELLO.','The stranger offers a handshake with a very clenched fist.',[['Shake hands','handshake'],['Back away','leave']]);
        else if(target.type==='drinker')showChoice('A STRANGER WITH A DRINK.','“Refreshing,” they promise. The cup is making a tiny fizzing noise.',[['Take a sip','drink'],['No thanks','leave']]);
        else showChoice('QUESTIONABLE ADVICE.','“The fake door is the real exit.” They avoid eye contact.',[['Trust them','trust'],['Ignore that','leave']]);
      }
      function showChoice(title,copy,choices) {
        // Fill the popup with a title, explanation, and one button for each available choice.
        talkTitle.textContent=title;talkCopy.textContent=copy;talkActions.replaceChildren();talkClose.hidden=true;
        for(const [label,choice] of choices){const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',()=>resolveInteraction(choice));talkActions.append(button);}
        talk.classList.add('show');
      }
      function showOutcome(title,copy,effect='') {
        // Replace the choices with the result text and a Continue button; optional effects are animated in the game view.
        talkTitle.textContent=title;talkCopy.textContent=copy;talkActions.replaceChildren();talkClose.hidden=false;
        if(effect){effectType=effect;effectTimer=1.25;}
      }
      // Good choices grant a one-hit shield; bad choices briefly reverse movement and play a visual effect.
      function giveGoodResult(copy) { player.shield=true;showOutcome('A SURPRISING WIN.',copy,'good'); }
      function giveBadResult(copy) { player.dizzy=3.2;showOutcome('NOT YOUR LUCKY DAY.',copy,'bad'); }
      function resolveInteraction(choice) {
        // Apply the selected result for a tree, character, fake door, or fake checkpoint.
        const target=pendingInteraction;if(!target)return;
        const fakeDoor=target.kind==='falseExit',fakeFlag=target.kind==='fakeCheckpoint',tree=trees.includes(target);
        if(fakeDoor||fakeFlag){
          const subject=fakeDoor?'door':'flag',action=(choice==='try'||choice==='claim');
          showOutcome('INCREDIBLE INVESTIGATION.',action?`You ${fakeDoor?'opened':'claimed'} the fake ${subject}. It did absolutely nothing. The level is impressed by your discovery.`:`You wisely walked away. The ${subject} will be here, pretending to matter.`);
        } else if(tree){
          if(choice==='rest')giveGoodResult('You rested under the tree and gained one-hit protection. The tree did more for you than your last plan.');
          else if(Math.random()<.5)giveGoodResult('You shook the tree and a lucky leaf landed on you. One hit of protection. Gardening has an odd skill tree.');
          else giveBadResult('That went well. The tree is not accepting appeals.');
        } else if(target.type==='puncher'){
          if(choice==='handshake'){
            pendingInteraction=null;talkActive=false;talk.classList.remove('show');target.punchTime=.38;target.punched=false;target.punchFatal=true;say('You chose the handshake. The stranger is winding up. Bold choice.');return;
          }
          showOutcome('TACTICAL RETREAT.', 'You backed away from the punch. The stranger calls this a handshake anyway.');
        } else if(target.type==='drinker'){
          if(choice==='drink'){if(Math.random()<.5)giveGoodResult('The drink is somehow delicious. You gained one-hit protection. Do not ask what was in it.');else giveBadResult('Well, that was a choice. The stranger is trying very hard not to laugh.');}
          else showOutcome('A RESPONSIBLE CHOICE.','You declined the mystery drink. The stranger says it was probably fine. That is not reassuring.');
        } else if(target.type==='helper'){
          if(choice==='charm')giveGoodResult('The charm blocks one trap hit. It is a button with a smiley face, but confidence is confidence.');
          else showOutcome('INDEPENDENT THINKING.','You declined free help. The stranger respects your commitment to making things harder.');
        } else if(choice==='trust')giveBadResult('You went with that advice. The stranger is already leaving, looking very pleased.');
        else showOutcome('WISE SUSPICION.','You ignored the advice. The liar calls you paranoid, which feels like confirmation.');
      }
      function closeTalk() {
        // Close the finished popup and let the game continue.
        if(!talkActive||talkClose.hidden)return;
        talkActive=false;talk.classList.remove('show');
        pendingInteraction=null;say('Back to the important business of not falling over.');
      }
      function drawInteractables() {
        // Draw the rare trees and stick figures on the canvas; punchers extend an arm during their swing.
        for(const tree of trees){const x=tree.x-camera,y=surfaceAt(tree.x);if(x<-30||x>width+30)continue;
          ctx.save();ctx.strokeStyle='#050505';ctx.lineWidth=3;line(x,y,x,y-42*tree.scale,3);line(x,y-25*tree.scale,x-15*tree.scale,y-37*tree.scale,2);line(x,y-30*tree.scale,x+16*tree.scale,y-42*tree.scale,2);
          ctx.beginPath();ctx.arc(x,y-47*tree.scale,13*tree.scale,0,Math.PI*2);ctx.stroke();ctx.restore();
        }
        for(const npc of npcs){const x=npc.x-camera,y=surfaceAt(npc.x);if(x<-30||x>width+30)continue;
          ctx.save();ctx.strokeStyle='#050505';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x,y-39,6,0,Math.PI*2);ctx.stroke();line(x,y-33,x,y-14,2.5);line(x,y-14,x-7,y,2.5);line(x,y-14,x+7,y,2.5);
          if(npc.type==='helper'){line(x-4,y-42,x-2,y-42,1);line(x+2,y-42,x+4,y-42,1);}
          const punch=npc.punchTime>0?Math.sin((.38-npc.punchTime)/.38*Math.PI):0;
          line(x,y-28,x-9,y-20,2);
          if(punch>0){line(x,y-28,x+10+punch*22,y-26,2.5);line(x+10+punch*22,y-26,x+14+punch*22,y-30,2.5);}
          else line(x,y-28,x+9,y-20,2);
          ctx.restore();
        }
      }
      function drawFakeMarkers() {
        // Draw the visible fake exit door and checkpoint flag on the path.
        for(const t of traps){
          if(t.kind!=='falseExit'&&t.kind!=='fakeCheckpoint')continue;
          const x=t.x-camera,y=surfaceAt(t.x);if(x<-60||x>width+60)continue;
          ctx.save();ctx.strokeStyle='#050505';ctx.fillStyle='#fff';ctx.lineWidth=3;
          if(t.kind==='falseExit'){
            ctx.strokeRect(x,y-76,48,76);ctx.beginPath();ctx.arc(x+36,y-38,2.5,0,Math.PI*2);ctx.fillStyle='#050505';ctx.fill();
            ctx.font='900 7px system-ui';ctx.textAlign='center';ctx.fillStyle='#050505';ctx.fillText('EXIT',x+24,y-82);
          } else {
            line(x,y,x,y-54,2.5);ctx.beginPath();ctx.moveTo(x,y-53);ctx.lineTo(x+27,y-45);ctx.lineTo(x,y-37);ctx.closePath();ctx.fillStyle='#fff';ctx.fill();ctx.stroke();
            ctx.font='900 6px system-ui';ctx.textAlign='left';ctx.fillStyle='#050505';ctx.fillText('CHECK',x+2,y-42);
          }
          ctx.restore();
        }
      }
      function completeLevel() {
        // Show the completion panel and choose its message and button label for this level.
        won=true;finish.classList.add('show');
        const title=document.querySelector('#finish-title'),copy=document.querySelector('#finish-copy'),button=document.querySelector('#again');
        if(levelIndex<levels.length-1) { title.textContent=`LEVEL ${levelIndex+1} CLEAR.`;copy.textContent='The next corridor has heard about you.';button.textContent='NEXT LEVEL →'; }
        else { title.textContent='YOU BEAT THE BAIT.';copy.textContent='Three levels. Several questionable design choices. One very stubborn stick figure.';button.textContent='PLAY AGAIN ↻'; }
        say('You made it through.');
      }
      function advanceLevel() {
        // Move to the next level, or start again at level one after the final level.
        if(levelIndex<levels.length-1) { levelIndex++;reset(true); }
        else { levelIndex=0;reset(true); }
      }
      function update(dt) {
        // Advance the game by one animation frame: move the player, update traps, check collisions, and refresh the score.
        // First update timers and moving hazards; dt means “delta time,” the seconds since the previous frame.
        flash=Math.max(0,flash-dt);
        if(won)return;
        if(quizActive||talkActive)return;
        if(player.dead)return;
        effectTimer=Math.max(0,effectTimer-dt);
        if(player.dizzy>0)player.dizzy=Math.max(0,player.dizzy-dt);
        if(player.invuln>0)player.invuln=Math.max(0,player.invuln-dt);
        if(player.knockback>0){player.knockback=Math.max(0,player.knockback-dt);player.x=Math.max(0,player.x-420*dt);}
        for(const t of traps) {
          if(!t.activated)continue;
          t.age+=dt;
          if(t.kind==='arrows') {
            t.nextShot-=dt;
            if(t.nextShot<=0&&t.age<1.8) { t.projectiles.push({x:t.x+215,y:surfaceAt(t.x)-45,vx:-740});t.nextShot=.62; }
            t.projectiles.forEach(a=>a.x+=a.vx*dt);
          }
          if(t.kind==='press') {
            const landing=surfaceAt(t.x)-8;t.pressY=Math.min(landing,18+t.age*700);
          }
          if(t.kind==='boulder') {
            if(t.boulderX===undefined)t.boulderX=t.x+220;
            t.boulderX-=430*dt;
          }
          if(t.kind==='echoJump'&&t.echoTimer>0) {
            t.echoTimer-=dt;
            if(t.echoTimer<=0&&!player.onGround)player.vy=-560;
          }
          if(t.kind==='fakeFloor'&&t.activated)t.open=true;
          if(t.kind==='oneWay'&&t.activated&&input.crouch&&player.x+player.w>t.x&&player.x<t.x+t.width)t.open=true;
          if(t.kind==='wind'&&t.activated&&player.x+player.w>t.x&&player.x<t.x+t.width) {
            t.force=Math.sin(t.age*5.3)*240;
          }
        }
        // Falling stones use gravity, and carry the player along if they are standing on one.
        for(const s of stones) if(s.falling) {
          const old=s.y;s.vy+=1500*dt;s.y+=s.vy*dt;
          if(player.support===s)player.y+=s.y-old;
        }
        for(const s of stones) if(s.moving&&!s.falling) {
          const old=s.x;s.x=s.moveBase+Math.sin(performance.now()/380+s.phase)*25;
          if(player.support===s)player.x+=s.x-old;
        }
        // Change the player's height for crouching, then calculate horizontal movement and platform blocking.
        if(player.onGround&&input.crouch&&!player.crouching) { player.y+=player.h-29;player.h=29;player.crouching=true; }
        else if((!input.crouch||!player.onGround)&&player.crouching) { player.y-=52-player.h;player.h=52;player.crouching=false; }
        const prevX=player.x,prevY=player.y,prevBottom=prevY+player.h;
        const currentSpeed=player.crouching?runSpeed*.62:runSpeed;
        const movingRight=player.dizzy>0?input.left:input.right,movingLeft=player.dizzy>0?input.right:input.left;
        let dx=(movingRight?currentSpeed:0)-(movingLeft?currentSpeed*.72:0);
        for(const t of traps) if(t.activated) {
          if(t.kind==='wind'&&player.x+player.w>t.x&&player.x<t.x+t.width)dx+=t.force||0;
        }
        let nextX=Math.max(0,Math.min(worldLength-player.w,player.x+dx*dt));
        const beforePlatforms=getPlatforms();
        for(const p of beforePlatforms) {
          if(p.falling)continue;
          const vertical=player.y+player.h>p.y+2&&player.y<p.bottom;
          if(vertical&&dx>0&&prevX+player.w<=p.x&&nextX+player.w>p.x)nextX=p.x-player.w;
          if(vertical&&dx<0&&prevX>=p.x+p.w&&nextX<p.x+p.w)nextX=p.x+p.w;
        }
        player.x=nextX;player.vx=dx;
        activateTraps(dt);
        if(Math.abs(dx)>0&&player.onGround)walkTime+=dt*Math.abs(dx)/runSpeed;
        // Jumping and gravity update the player's vertical position and landing on platforms.
        if(input.jump&&player.onGround) {
          player.vy=-jumpSpeed;player.onGround=false;player.support=null;walkTime=0;
          const echo=traps.find(t=>t.kind==='echoJump'&&t.activated&&player.x+player.w>t.x&&player.x<t.x+t.width);
          if(echo)echo.echoTimer=.32;
        }
        input.jump=false;
        const oldBottom=player.y+player.h;
        player.vy+=gravity*dt;player.y+=player.vy*dt;
        player.onGround=false;player.support=null;
        if(player.vy>=0) for(const p of getPlatforms()) {
          if(p.falling)continue;
          const across=player.x+player.w>p.x+3&&player.x<p.x+p.w-3;
          if(across&&oldBottom<=p.y+7&&player.y+player.h>=p.y) {
            player.y=p.y-player.h;player.vy=0;player.onGround=true;player.support=p.kind==='stone'?stones.find(s=>s.x===p.x):null;
            if(player.support) { player.support.wait+=dt;if(player.support.wait>.3)player.support.falling=true; }
          }
        }
        // Check for falling off-screen, then check collisions with active hazards and characters.
        if(player.y>height+45) { die(fallTaunt());return; }
        const box={x:player.x+2,y:player.y+2,w:player.w-4,h:player.h-4};
        for(const t of traps) {
          if(!t.activated)continue;
          if(t.kind==='press') {
            const slab={x:t.x-camera-34,y:t.pressY,w:68,h:23};
            if(overlap(box,{x:slab.x+camera,y:slab.y,w:slab.w,h:slab.h}))hurt('The ceiling won. It will be unbearable about this.');
          }
          if(t.kind==='arrows') for(const a of t.projectiles) {
            if(a.x>box.x-8&&a.x<box.x+box.w+8&&a.y>box.y-8&&a.y<box.y+box.h+8)hurt('You got hit by an arrow in a hallway. The archery club is thrilled.');
          }
          if(t.kind==='spikes'&&box.x+box.w>t.x&&box.x<t.x+t.width&&box.y+box.h>surfaceAt(t.x)-43)hurt('You stepped directly onto the spikes. They appreciate the delivery.');
          if(t.kind==='ceiling'&&t.age<.85&&!player.crouching&&player.x+player.w>t.x&&player.x<t.x+t.width&&player.y<surfaceAt(t.x)-36)hurt('The low ceiling said “duck.” You chose confidence.');
          if(t.kind==='boulder'&&t.boulderX!==undefined&&Math.abs(player.x+player.w/2-t.boulderX)<31&&player.y+player.h>surfaceAt(t.boulderX)-39)hurt('The boulder won the race. It does not even have legs.');
        }
        if(player.dead)return;
        for(const npc of npcs)if(npc.punchTime>0){
          const before=npc.punchTime;npc.punchTime=Math.max(0,npc.punchTime-dt);
          if(!npc.punched&&before>.2&&npc.punchTime<=.2){npc.punched=true;
            if(npc.punchFatal)die('The handshake was a punch. You are out cold, and the stranger is very proud of their greeting.',quizIndex===0);
          }
        }
        // Start nearby interactions, ask checkpoint questions, and update progress and the saved best distance.
        const encounter=findNearbyInteractable();if(encounter)interact(encounter);
        if(player.dead)return;
        if(quizIndex<currentQuestions.length&&player.onGround&&player.x+player.w>=currentQuestions[quizIndex].x)askCheckpoint(currentQuestions[quizIndex]);
        if(player.x>worldLength-125) completeLevel();
        camera=Math.max(0,Math.min(worldLength-width,player.x-width*.3));
        const pct=Math.min(100,Math.floor(player.x/(worldLength-player.w)*100));distanceEl.textContent=pct+'%';meter.style.width=pct+'%';
        if(pct>bestDistances[levelIndex]) {
          bestDistances[levelIndex]=pct;bestDistanceEl.textContent=pct+'%';
          try { localStorage.setItem(bestStorageKey,JSON.stringify(bestDistances)); } catch { // Keep the in-memory record if storage is unavailable.
          }
        }
      }
      // Find the height of the floor or raised path at a horizontal world position.
      function surfaceAt(x) { const p=terrain().find(s=>x>=s.x&&x<=s.x+s.w);return p?p.y:floorY(); }
      // Check whether a drawn line, such as a limb or projectile, passes through a rectangle.
      function segmentHitsRect(x1,y1,x2,y2,r,pad) {
        const steps=24;
        for(let i=0;i<=steps;i++){const q=i/steps,x=x1+(x2-x1)*q,y=y1+(y2-y1)*q;if(x>=r.x-pad&&x<=r.x+r.w+pad&&y>=r.y-pad&&y<=r.y+r.h+pad)return true;}
        return false;
      }
      // Draw a straight line on the canvas; ctx is the canvas drawing context.
      function line(x1,y1,x2,y2,w=2) { ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke(); }
      // Draw the stick figure in its walking, jumping, or crouching pose.
      function drawPlayer(sx) {
        const bob=player.onGround&&Math.abs(player.vx)>0?Math.sin(walkTime*13)*2:0;
        const cx=sx+player.w/2,cy=player.y+bob;
        ctx.save();ctx.strokeStyle='#050505';ctx.fillStyle='#fff';ctx.lineWidth=3.4;ctx.lineCap='round';ctx.lineJoin='round';
        ctx.beginPath();ctx.arc(cx,cy+8,7,0,Math.PI*2);ctx.fill();ctx.stroke();
        const head=cy+16,torso=cy+35;
        if(player.crouching) {
          ctx.beginPath();ctx.arc(cx,cy+7,5.5,0,Math.PI*2);ctx.fill();ctx.stroke();
          line(cx,cy+13,cx+5,cy+22,3.5);line(cx+2,cy+16,cx-8,cy+20,3);line(cx+3,cy+17,cx+12,cy+18,3);
          line(cx+5,cy+22,cx-5,cy+27,3.2);line(cx+5,cy+22,cx+13,cy+27,3.2);
        } else if(!player.onGround) {
          line(cx,head,cx,torso,3.5);line(cx,head+4,cx-12,head-5,3);line(cx,head+4,cx+12,head-5,3);
          line(cx,torso,cx-10,torso+10,3.4);line(cx,torso,cx+10,torso+11,3.4);
        } else {
          const swing=Math.sin(walkTime*13),arm=Math.cos(walkTime*13);
          line(cx,head,cx,torso,3.5);
          line(cx,head+5,cx-10-arm*5,head+17+swing*4,3);
          line(cx,head+5,cx+10+arm*5,head+17-swing*4,3);
          line(cx,torso,cx-8-swing*7,torso+14,3.4);
          line(cx,torso,cx+8+swing*7,torso+14,3.4);
        }
        ctx.restore();
      }
      // Draw the short visual effect shown when a drink or other interaction helps or harms the player.
      function drawEffect() {
        if(effectTimer<=0)return;
        const x=player.x-camera+player.w/2,y=player.y-8,t=performance.now()/170,alpha=Math.min(1,effectTimer/.22);
        ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='#050505';ctx.fillStyle='#fff';ctx.lineWidth=2;
        if(effectType==='good'){
          for(let i=0;i<6;i++){const angle=t+i*Math.PI/3,r=24+Math.sin(t+i)*5,sx=x+Math.cos(angle)*r,sy=y+Math.sin(angle)*r;ctx.beginPath();for(let p=0;p<10;p++){const a=-Math.PI/2+p*Math.PI/5,rad=p%2?4:9,px=sx+Math.cos(a)*rad,py=sy+Math.sin(a)*rad;if(p===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.fill();ctx.stroke();}
        } else {
          ctx.beginPath();ctx.arc(x,y,18+Math.sin(t)*5,t,t+Math.PI*1.55);ctx.stroke();ctx.beginPath();ctx.arc(x,y,28+Math.cos(t)*4,t+Math.PI,t+Math.PI*2.45);ctx.stroke();
        }
        ctx.restore();
      }
      // Paint the complete scene: background, platforms, hazards, characters, and player.
      function render() {
        const fy=floorY();ctx.clearRect(0,0,width,height);ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
        ctx.strokeStyle='#050505';ctx.lineWidth=2;line(0,13,width,13,2);line(0,height-14,width,height-14,2);
        drawDepth();drawNature();drawBrickwork();drawStartInstructions();
        for(const p of getPlatforms()) {
          const px=p.x-camera;if(px+p.w<0||px>width)continue;
          ctx.fillStyle='#fff';ctx.strokeStyle='#050505';ctx.lineWidth=2;
          ctx.fillRect(px,p.y,p.w,p.h);ctx.strokeRect(px,p.y,p.w,p.h);
          if(p.kind==='stone') { ctx.beginPath();ctx.moveTo(px+5,p.y+5);ctx.lineTo(px+15,p.y+5);ctx.moveTo(px+23,p.y+10);ctx.lineTo(px+34,p.y+10);ctx.strokeStyle='#111';ctx.lineWidth=1;ctx.stroke(); }
        }
        drawInteractables();drawFakeMarkers();
        drawMockingSigns();
        // Hazards are hidden until the short trigger delay ends.
        for(const t of traps) {
          if(!t.activated)continue;
          const tx=t.x-camera;
          const sy=surfaceAt(t.x);
          if(t.kind==='press'&&t.pressY!==undefined) { ctx.fillStyle='#fff';ctx.strokeStyle='#050505';ctx.lineWidth=2.5;ctx.fillRect(tx-34,t.pressY,68,23);ctx.strokeRect(tx-34,t.pressY,68,23);ctx.beginPath();ctx.moveTo(tx-24,t.pressY+5);ctx.lineTo(tx-10,t.pressY+5);ctx.moveTo(tx+8,t.pressY+15);ctx.lineTo(tx+24,t.pressY+15);ctx.stroke(); }
          if(t.kind==='ceiling'&&t.age<.85) { ctx.fillStyle='#fff';ctx.strokeStyle='#050505';ctx.lineWidth=2.5;ctx.fillRect(tx,sy-37,t.width,22);ctx.strokeRect(tx,sy-37,t.width,22); }
          if(t.kind==='spikes') { const n=Math.max(2,Math.floor(t.width/19));for(let i=0;i<n;i++){const x=tx+i*t.width/n;ctx.beginPath();ctx.moveTo(x,sy);ctx.lineTo(x+t.width/n/2,sy-42);ctx.lineTo(x+t.width/n,sy);ctx.strokeStyle='#050505';ctx.lineWidth=2;ctx.stroke();} }
          if(t.kind==='arrows') {
            const launcher=tx+215;ctx.strokeStyle='#050505';ctx.lineWidth=2;line(launcher,fy-100,launcher,fy-35,3);line(launcher,fy-100,launcher-14,fy-100,3);
            for(const a of t.projectiles){const ax=a.x-camera;line(ax-12,a.y,ax+12,a.y,2.5);line(ax-12,a.y,ax-5,a.y-5,2);line(ax-12,a.y,ax-5,a.y+5,2);}
          }
          if(t.kind==='boulder'&&t.boulderX!==undefined) { const bx=t.boulderX-camera,by=sy-19;ctx.beginPath();ctx.arc(bx,by,19,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#050505';ctx.lineWidth=2.5;ctx.stroke();line(bx-7,by-4,bx,by-10,1.5);line(bx+3,by+5,bx+10,by+1,1.5); }
          if(t.kind==='wind') { ctx.strokeStyle='#050505';ctx.lineWidth=1.5;for(let i=0;i<3;i++){const y=sy-18-i*15,offset=(t.age*190+i*43)%t.width;line(tx+offset,y,tx+offset+24,y,1.5);line(tx+offset+19,y-4,tx+offset+24,y,1.5);line(tx+offset+19,y+4,tx+offset+24,y,1.5);} }
          if(t.kind==='oneWay'&&t.open) { for(let x=tx;x<tx+t.width;x+=16){line(x,sy,x+7,sy+8,1.5);line(x+7,sy+8,x+14,sy,1.5);} }
          if(t.kind==='echoJump'&&t.echoTimer>0) { ctx.globalAlpha=.5;ctx.beginPath();ctx.arc(tx+55,sy-5,23,0,Math.PI*2);ctx.strokeStyle='#050505';ctx.stroke();ctx.globalAlpha=1; }
        }
        drawCheckpointFlags();
        // End door, also drawn only when the corridor brings it into view.
        if(worldLength-camera<width+25){const gx=worldLength-88-camera,gy=surfaceAt(worldLength-88);ctx.strokeStyle='#050505';ctx.lineWidth=3;ctx.strokeRect(gx,gy-112,62,112);ctx.beginPath();ctx.arc(gx+47,gy-54,2.5,0,Math.PI*2);ctx.fillStyle='#050505';ctx.fill();}
        if(!player.dead)drawPlayer(player.x-camera);
        if(!player.dead)drawEffect();
        if(flash>0){ctx.fillStyle=`rgba(255,255,255,${flash/.13*.78})`;ctx.fillRect(0,0,width,height);}
      }
      // Add faint brick lines to the corridor wall for texture.
      function drawBrickwork() {
        ctx.save();ctx.beginPath();ctx.rect(0,14,width,floorY()-20);ctx.clip();ctx.strokeStyle='#050505';ctx.globalAlpha=.17;ctx.lineWidth=.7;
        const spacing=74,rowH=22,first=Math.floor(camera/spacing)*spacing;
        for(let row=0,y=25;y<floorY()-18;row++,y+=rowH) {
          const offset=row%2?spacing/2:0;
          for(let wx=first-spacing;wx<camera+width+spacing;wx+=spacing) {
            const x=wx+offset-camera;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+spacing,y);ctx.moveTo(x,y-rowH);ctx.lineTo(x,y);ctx.stroke();
          }
        }
        ctx.restore();
      }
      // Draw distant layered hills to make the scenery feel deeper.
      function drawDepth() {
        ctx.save();ctx.strokeStyle='#050505';ctx.globalAlpha=.24;ctx.lineWidth=1;
        const start=Math.floor(camera/170)*170;
        for(let layer=0;layer<3;layer++) {
          ctx.beginPath();
          for(let wx=start;wx<=camera+width+170;wx+=18) {
            const wave=Math.sin(wx*.009+layer*1.7)*13+Math.sin(wx*.021+layer)*7;
            const y=height-18-layer*17-wave;
            if(wx===start)ctx.moveTo(wx-camera,y);else ctx.lineTo(wx-camera,y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      // Draw decorative trees and plants in the distance; these are scenery only.
      function drawNature() {
        ctx.save();ctx.strokeStyle='#050505';ctx.fillStyle='#fff';ctx.globalAlpha=.28;ctx.lineWidth=1.2;
        for(const item of scenery) {
          const x=item.x-camera;if(x<-60||x>width+60)continue;const base=height-18,h=item.height;
          if(item.tree) {
            line(x,base,x,base-h,1.4);line(x,base-h*.65,x-item.spread,base-h*.9,1.2);line(x,base-h*.58,x+item.spread,base-h*.86,1.2);
            ctx.beginPath();ctx.arc(x,base-h, item.spread*.52,0,Math.PI*2);ctx.arc(x-item.spread*.45,base-h*.82,item.spread*.42,0,Math.PI*2);ctx.arc(x+item.spread*.42,base-h*.78,item.spread*.4,0,Math.PI*2);ctx.stroke();
          } else {
            line(x-item.spread,base,x,base-h*.42,1.2);line(x,base-h*.42,x+item.spread,base,1.2);line(x-5,base,x-2,base-8,1);line(x+5,base,x+8,base-10,1);
          }
        }
        ctx.restore();
      }
      // Show the movement instructions on the wall near the starting area.
      function drawStartInstructions() {
        if(camera>420)return;
        const x=16-camera,y=20,panelW=Math.min(430,width-32),small=height<300,fontSize=small?7.3:9,lineHeight=small?12:16;
        const rows=['HOW TO PLAY','MOVE  ← → / A D','JUMP  SPACE / ↑ / W    CROUCH  ↓ / S','REACH THE EXIT. WATCH YOUR STEP.','TRUE / FALSE QUESTIONS SAVE CHECKPOINTS.','PEOPLE, TREES, DOORS & FLAGS OFFER CHOICES.','DIED? PRESS ANY KEY OR TRY AGAIN TO RESPAWN.'];
        const panelH=12+rows.length*lineHeight;
        ctx.save();ctx.fillStyle='#fff';ctx.strokeStyle='#050505';ctx.lineWidth=2;ctx.fillRect(x,y,panelW,panelH);ctx.strokeRect(x,y,panelW,panelH);
        ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='#050505';
        rows.forEach((row,i)=>{ctx.font=`${i===0?'950':'750'} ${i===0?(small?9:12):fontSize}px system-ui`;ctx.fillText(row,x+9,y+7+i*lineHeight);});
        ctx.restore();
      }
      // Draw the flags that mark the checkpoint question locations.
      function drawCheckpointFlags() {
        for(let i=0;i<currentQuestions.length;i++) {
          const x=currentQuestions[i].x-camera;if(x<-15||x>width+15)continue;
          const y=surfaceAt(currentQuestions[i].x);ctx.strokeStyle='#050505';ctx.lineWidth=1.5;line(x,y,x,y-32,1.5);
          ctx.beginPath();ctx.moveTo(x,y-32);ctx.lineTo(x+15,y-26);ctx.lineTo(x,y-20);ctx.closePath();ctx.fillStyle='#fff';ctx.fill();ctx.stroke();
        }
      }
      // Put the game's mocking signs along the corridor.
      function drawMockingSigns() {
        for(const [wx,text] of currentSigns) {
          const x=wx-camera;if(x<-160||x>width+160)continue;const y=surfaceAt(wx);
          ctx.strokeStyle='#050505';ctx.lineWidth=1.3;line(x,y,x,y-32,1.3);
          ctx.font='800 8px system-ui';const words=text.split(' '),rows=[''];
          for(const word of words){const i=rows.length-1,next=(rows[i]?rows[i]+' ':'')+word;if(ctx.measureText(next).width>106)rows.push(word);else rows[i]=next;}
          const boxW=118,boxH=rows.length*10+10,bx=x-boxW/2,by=y-32-boxH;
          ctx.fillStyle='#fff';ctx.strokeStyle='#050505';ctx.lineWidth=1.5;ctx.fillRect(bx,by,boxW,boxH);ctx.strokeRect(bx,by,boxW,boxH);
          ctx.fillStyle='#050505';rows.forEach((row,i)=>ctx.fillText(row,bx+6,by+12+i*10));
        }
      }
      // Repeat the update and drawing steps using requestAnimationFrame, the browser's animation scheduler.
      function frame(time) { const dt=Math.min(.032,(time-last)/1000||0);last=time;update(dt);render();requestAnimationFrame(frame); }
      // Match keyboard keys to game actions so the same movement code works for different keys.
      const keyMap={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'jump',' ':'jump',w:'jump',ArrowDown:'crouch',s:'crouch'};
      // An event listener is a function the browser runs when something happens, such as a key press.
      // This listener handles movement keys and lets any key restart after a death.
      window.addEventListener('keydown',e=>{
        if(player?.dead){if(!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();reset(returnToStart);}return;}
        const action=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(action){e.preventDefault();input[action]=true;}
      });
      // Stop movement when a key is released.
      window.addEventListener('keyup',e=>{const action=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(action)input[action]=false;});
      // Let the true/false buttons answer the checkpoint question.
      document.querySelectorAll('#quiz [data-answer]').forEach(button=>button.addEventListener('click',()=>answerCheckpoint(button.dataset.answer==='true')));
      // Clear held keys if the browser window loses focus, so movement cannot get stuck.
      window.addEventListener('blur',()=>{input.left=false;input.right=false;input.jump=false;input.crouch=false;});
      // Support touch or mouse controls: hold movement buttons, then release them to stop.
      document.querySelectorAll('[data-hold]').forEach(button=>{
        const action=button.dataset.hold;
        button.addEventListener('pointerdown',e=>{e.preventDefault();input[action]=true;button.classList.add('active');button.setPointerCapture(e.pointerId);});
        const release=()=>{input[action]=false;button.classList.remove('active');};
        button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
      });
      // The jump button triggers one jump when tapped.
      document.querySelector('[data-jump]').addEventListener('pointerdown',e=>{e.preventDefault();input.jump=true;});
      // Connect the restart, death, interaction, and next-level buttons to their actions.
      document.querySelector('#restart').addEventListener('click',()=>reset(true));
        document.querySelector('#death-again').addEventListener('click',()=>reset(returnToStart));
      document.querySelector('#talk-close').addEventListener('click',closeTalk);
      document.querySelector('#again').addEventListener('click',advanceLevel);
      // Resize the game drawing area when the browser window changes size.
      window.addEventListener('resize',()=>{const onGround=player&&player.onGround;resize();if(onGround)player.y=floorY()-player.h;});
      // Set the canvas pixel size to match its displayed size, including high-resolution screens.
      function resize(){const rect=canvas.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);width=Math.max(320,rect.width);height=width<560?Math.max(200,width*.55):420;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
      // Prepare the canvas, start a fresh game, and begin the repeating animation frames.
      resize();reset(true);requestAnimationFrame(frame);
    })();
