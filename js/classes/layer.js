class Layer {
    constructor(seed, id=0, parent_layer=undefined, is_ngminus=false) {
        this.parent_layer = parent_layer;
        this.is_ngminus = is_ngminus;

        this.id = id;

        this.points = new Decimal(0);

        this.upgrades = {};

        this.child_left = undefined;
        this.child_right = undefined;

        this.boost = new Decimal(1);

        this.points_name = "";

        if (parent_layer !== undefined) {
            if (this.is_ngminus) parent_layer.child_left = this;
            else parent_layer.child_right = this;

            if (this.is_ngminus) {
                this.upgrade_time = parent_layer.upgrade_time.mul(2);
                this.final_goal = parent_layer.final_goal.pow(1.2);
            }
            else {
                this.upgrade_time = parent_layer.upgrade_time.mul(1.5);
                this.final_goal = parent_layer.final_goal.pow(3);
            }

            this.name = parent_layer.name;
            if (this.name == "Original") this.name = "NG";
            if (this.is_ngminus) this.name += "-";
            else this.name += "+";

            this.depth = parent_layer.depth + 1;

            this.coord = 2 * parent_layer.coord;
            if (!this.is_ngminus) this.coord += 1;
            this.coord = this.coord % (2 ** 32);

            if (this.is_ngminus) this.color = mixColors(parent_layer.color, [72, 159, 181]);
            else this.color = mixColors(parent_layer.color, [214, 40, 40]);
        }
        else {
            this.upgrade_time = new Decimal(10);
            this.final_goal = new Decimal(1e10);
            this.name = "Original";
            this.depth = 0;
            this.coord = 0;
            this.color = [19, 138, 54];
        }

        this.left_branch = false;
        this.right_branch = false;

        this.rng = sfc32(this.depth, this.coord, seed, 0xDEADBEEF);
        for (let i = 0; i < 15; i++) this.rng();

        if (parent_layer != undefined) {
            this.points_name = choose(ITY_WORDS, this.rng);

            //random more color!
            let tempcolormodifier = [0,0,0]
            for (let i = 0; i < 3;i++)
            tempcolormodifier[i] += Math.round(this.rng()*256);
            /*for (let index in this.color)
            this.color[index] = Math.max(0,Math.min(this.color[index]+tempcolormodifier[index],255));*/
            this.color = mixColors(this.color,tempcolormodifier);
            if (this.rng()>0.5&&rgbtohsv(this.color[0],this.color[1],this.color[2])[1]<=50){//提升饱和度
                let temphsvArray = rgbtohsv(this.color[0],this.color[1],this.color[2]);
                let randomodifier = DeltaRand(1.5,1,this.rng())
                temphsvArray[1] = Math.round(temphsvArray[1]*randomodifier)
                this.color = hsvtorgb(temphsvArray[0],temphsvArray[1],temphsvArray[2]);
            }
            //color mixing
            if (Readability(this.color, [255, 255, 255]) < 1.5)
                this.color = MostReadable(this.color, [255, 255, 255], 1.5, 0);
            if (Readability(this.color, [9, 19, 23]) < 1.75)
                this.color = MostReadable(this.color, [9, 19, 23], 1.75, 1);

            //randomize target
            if (this.rng()>Math.max(1-this.depth*0.075,0.5)){
                /*let randomdelta = this.rng()*this.depth*0.1-this.depth*0.05
                this.upgrade_time = this.upgrade_time.times(1+randomdelta)
                if (this.is_ngminus)
                    this.upgrade_time = this.upgrade_time.max(this.parent_layer.upgrade_time).min(this.parent_layer.upgrade_time.times(3));
                else
                    this.upgrade_time = this.upgrade_time.max(this.parent_layer.upgrade_time.times(0.5)).min(this.parent_layer.upgrade_time.times(2));*/
                let randomodifier = 1/0;
                if (this.is_ngminus) {
                    while(randomodifier>3||randomodifier<1){
                        randomodifier = DeltaRand(2,this.depth*0.1,this.rng());
                    }
                 }
                else {
                    while(randomodifier>2||randomodifier<0.5){
                        randomodifier = DeltaRand(1.5,this.depth*0.1,this.rng());
                    }
                }
                this.upgrade_time = this.parent_layer.upgrade_time.times(randomodifier);
            }
            if (this.rng()>Math.max(1-this.depth*0.025,0.75)){
                /*let randomdelta = this.rng()*this.depth*0.2-this.depth*0.1
                this.final_goal = this.final_goal.pow(1+randomdelta)
                if (this.is_ngminus)
                    this.final_goal = this.final_goal.max(this.parent_layer.final_goal.pow(-2.5));
                else
                this.final_goal = this.final_goal.max(this.parent_layer.final_goal);*/
                let randomodifier = -Infinity;
                if (this.is_ngminus) {
                    while(randomodifier<-2.5){
                        randomodifier = DeltaRand(1.2,this.depth*0.2,this.rng());
                    }
                 }
                else {
                    while(randomodifier<1){
                        randomodifier = DeltaRand(2,this.depth*0.2,this.rng());
                    }
                }
                this.final_goal = this.parent_layer.final_goal.pow(randomodifier);
            }
        }

        this.el = document.createElement("div");
        this.el.className = "tree-node-container";
        if (parent_layer === undefined) {
            this.el.style.top = "0px";
            this.el.style.left = "0px";
            this.el.style.transform = "translate(-50%, -50%)";
            document.getElementById("tree").appendChild(this.el);
        } else {
            this.el.style.top = "15em";
            this.el.style.left = (this.is_ngminus ? "-" : "") + "10em";
            this.el.style.transform = "";
            parent_layer.el.appendChild(this.el);
        }

        this.nodeEl = document.createElement("div");
        this.nodeEl.onclick = () => this.selectLayer();
        this.nodeEl.className = "tree-node";
        this.nodeEl.style.backgroundColor = formAsRGB(this.color);
        this.el.appendChild(this.nodeEl);

        this.label = document.createElement("p");
        this.label.className = "node-text";
        this.label.innerText = parent_layer === undefined ? "OG" : this.points_name.slice(0, 3);
        this.nodeEl.appendChild(this.label);

        this.unlockReq = document.createElement("p");
        this.unlockReq.className = "unlock-req";
        if (player != undefined && player.isChinese) this.unlockReq.innerText = `达到 ${formatNumber(this.final_goal)} ${this.points_name ? this.points_name + " 点数" : "点数"} 以解锁`;
        else this.unlockReq.innerText = `Get ${formatNumber(this.final_goal)} ${this.points_name ? this.points_name + " points" : "points"} to unlock`;
        this.unlockReq.setAttribute('layerid',id)
        this.el.appendChild(this.unlockReq);

        this.generateUpgrades();
        this.balanceUpgrades();
        this.screenUpdate();
    }

    generateUpgrade() {
        let type_probs = {
            "add": Object.keys(this.upgrades).length == 0 ? (this.depth == 0 ? 0 : 1) : 1 / Object.keys(this.upgrades).length,
            "mul": 0.5,
            "pow": Object.keys(this.upgrades).length < 2 ? 0 : Math.pow(Object.keys(this.upgrades).length, 2) / 100,
            "mul_log": Math.pow(Object.keys(this.upgrades).length, 0.5) / 10,
            "mul_pow": 0//Math.pow(Object.keys(this.upgrades).length, 1) / 50
        }
        if (Object.keys(this.upgrades).length == 2) { // force an add
            let has_add = false;
            for (let key of Object.keys(this.upgrades)) {
                if (this.upgrades[key].type == "add") has_add = true;
            }
            if (!has_add) {
                for (let key of Object.keys(type_probs)) {
                    if (key != "add") type_probs[key] = 0;
                }
            }
        }

        let type = chooseDict(type_probs, this.rng);

        let target_probs = {
            "points": 10
        }
        if (type != "mul_log" && type != "mul_pow") {
            for (let key of Object.keys(this.upgrades)) {
                if (this.upgrades[key].type == type) continue;
                if (this.upgrades[key].type == "mul_log" || this.upgrades[key].type == "mul_pow" || this.upgrades[key].target != "points") continue;
                if (type == "mul" && this.upgrades[key].type != "pow") target_probs[key] = 1;
                if (type == "pow" && this.upgrades[key].type != "add") target_probs[key] = 2;
            }
        }
        let target = chooseDict(target_probs, this.rng);

        let upgrade = new Upgrade(this, this.depth + "_" + Object.keys(this.upgrades).length, type, 0, target, 0, this.rng);

        this.upgrades[upgrade.id] = upgrade;
    }

    generateUpgrades() {
        if (this.is_ngminus) for (let i = 0; i < 4; i++) this.generateUpgrade();
        if (this.parent_layer == undefined) for (let i = 0; i < 8; i++) this.generateUpgrade();
        else {
            for (let key of Object.keys(this.parent_layer.upgrades)) {
                this.upgrades[key] = new Upgrade(this, key, 0, 0, "points", 0);
                this.upgrades[key].copyUpgrade(this.parent_layer.upgrades[key]);
            }
            if (!this.is_ngminus) for (let i = 0; i < 4; i++) this.generateUpgrade();
        }
    }

    balanceUpgrades() {
        let upgrades_left = Object.keys(this.upgrades).length;
        let last_target = new Decimal(1);
        let inflation_precaution = 1;
        for (let key of Object.keys(this.upgrades)) {
            let separation_pow = upgrades_left;
            if (this.upgrades[key].type == "add") separation_pow = Math.pow(separation_pow, 1.9 + 0.2 * this.rng());
            if (this.upgrades[key].type == "mul") separation_pow = Math.pow(separation_pow, 1.15 + 0.2 * this.rng());
            if (this.upgrades[key].type == "pow") separation_pow = Math.pow(separation_pow, 0.65 + 0.2 * this.rng());
            if (this.upgrades[key].type == "mul_log") separation_pow = Math.pow(separation_pow, 0.9 + 0.2 * this.rng());
            if (this.upgrades[key].type == "mul_pow") separation_pow = Math.pow(separation_pow, 0.6 + 0.2 * this.rng());

            let base_production = this.calculateProduction(this.depth == 0 ? 1 : 0.1 / this.depth, last_target);
            let base_last_target = last_target.max(base_production.mul(this.upgrade_time)).min(this.final_goal.div(last_target).pow(1 / Math.pow(separation_pow, 0.25)).mul(last_target));

            let base_target = properPrecision(this.final_goal.div(base_last_target).pow(1 / separation_pow).mul(base_last_target).round().max(last_target.add(1)).min(this.final_goal), 1);

            let target_production = new Decimal(base_target);
            target_production = target_production.div(this.upgrade_time).max(base_production);

            this.upgrades[key].cost = new Decimal(last_target);

            //console.log(key + ", base: " + formatNumber(base_production));
            //console.log(key + ", target: " + formatNumber(target_production));

            if (this.upgrades[key].target != "points") {
                let root_upgrade = this.upgrades[key].target;
                while (this.upgrades[root_upgrade].target != "points") root_upgrade = this.upgrades[root_upgrade].target;
                base_production = new Decimal(this.depth == 0 ? 1 : 0.1 / this.depth);
                for (let key2 of Object.keys(this.upgrades)) {
                    if (this.upgrades[key2].target != "points") continue;
                    base_production = this.upgrades[key2].applyEffect(base_production, last_target);
                    if (key2 == root_upgrade) break;
                }
                for (let key2 of Object.keys(this.upgrades).reverse()) {
                    if (key2 == root_upgrade) break;
                    if (this.upgrades[key2].target != "points") continue;
                    target_production = this.upgrades[key2].applyReverseEffect(target_production, last_target);
                }
                if (this.upgrades[root_upgrade].type == "add") {
                    //console.log(key + " unraveling, base: " + formatNumber(base_production));
                    //console.log(key + " unraveling, target: " + formatNumber(target_production));
                    let other_prod = base_production.sub(this.upgrades[root_upgrade].applyEffect(1));
                    //console.log("other_prod: " + formatNumber(other_prod));
                    base_production = this.upgrades[root_upgrade].applyEffect(1);
                    target_production = target_production.sub(other_prod);
                }
                if (this.upgrades[root_upgrade].type == "mul") {
                    //console.log(key + " unraveling, base: " + formatNumber(base_production));
                    //console.log(key + " unraveling, target: " + formatNumber(target_production));
                    let other_prod = base_production.div(this.upgrades[root_upgrade].applyEffect(1));
                    //console.log("other_prod: " + formatNumber(other_prod));
                    base_production = this.upgrades[root_upgrade].applyEffect(1);
                    target_production = target_production.div(other_prod);
                }
                if (this.upgrades[root_upgrade].type == "pow") {
                    //console.log(key + " unraveling, base: " + formatNumber(base_production));
                    //console.log(key + " unraveling, target: " + formatNumber(target_production));
                    let other_prod = base_production.root(this.upgrades[root_upgrade].applyEffect(1)).max(2);
                    //console.log("other_prod: " + formatNumber(other_prod));
                    base_production = this.upgrades[root_upgrade].applyEffect(1);
                    target_production = target_production.log(other_prod);
                }

                //console.log(key + ", result base: " + formatNumber(base_production));
                //console.log(key + ", result target: " + formatNumber(target_production));
            }

            //if (this.upgrades[key].type == "add") console.log("base result: " + formatNumber(new Decimal(target_production.sub(base_production))));
            //if (this.upgrades[key].type == "mul") console.log("base result: " + formatNumber(new Decimal(target_production.div(base_production))));
            //if (this.upgrades[key].type == "pow") console.log("base result: " + formatNumber(new Decimal(target_production.log(base_production.max(2)))));
            //if (this.upgrades[key].type == "mul_log") console.log("base result: " + formatNumber(new Decimal(target_production.div(base_production).log(last_target.max(1).log10().max(2)))));

            this.upgrades[key].bought = true;

            if (this.upgrades[key].type == "add") this.upgrades[key].effect = properPrecision(new Decimal(target_production.sub(base_production).max(this.upgrades[key].target == "points" ? 1 : 0.001)), 0);
            if (this.upgrades[key].type == "mul") this.upgrades[key].effect = properPrecision(new Decimal(target_production.div(base_production).max(1.1)), 1);
            if (this.upgrades[key].type == "pow") this.upgrades[key].effect = properPrecision(new Decimal(target_production.log(base_production.max(2)).max(1.001)), 3);
            if (this.upgrades[key].type == "mul_log") this.upgrades[key].effect = new Decimal(target_production.div(base_production).log(last_target.max(1).log10().max(2)).max(0.1));
            if (this.upgrades[key].type == "mul_pow") {
                this.upgrades[key].effect = new Decimal(target_production.div(base_production).log(last_target.max(2)).max(0.001).min(inflation_precaution * 0.3));
                inflation_precaution -= this.upgrades[key].effect.toNumber();
            }

            last_target = new Decimal(base_target);
            upgrades_left -= 1;
        }

        for (let key of Object.keys(this.upgrades)) this.upgrades[key].bought = false;
    }

    calculateProduction(base=1, total=this.points, ignore_add=false) {
        let production = new Decimal(base);
        for (let key of Object.keys(this.upgrades)) {
            if (this.upgrades[key].target == "points" && (!ignore_add || this.upgrades[key].type != "add")) production = this.upgrades[key].applyEffect(production, total);
        }
        production = production.mul(this.boost);
        return production;
    }

    calculateReverseProduction(base=1, total=this.points, ignore_add=false) {
        let production = new Decimal(base);
        production = production.div(this.boost);
        for (let key of Object.keys(this.upgrades).reverse()) {
            if (this.upgrades[key].target == "points" && (!ignore_add || this.upgrades[key].type != "add")) production = this.upgrades[key].applyReverseEffect(production, total);
        }
        return production;
    }

    getBoostValue() {
        let boost = this.points.add(1).log(this.final_goal).pow(0.5).mul(3).add(1);
        // Softcaps
        if (boost.gt(10)) boost = boost.div(10).log10().add(1).mul(10);
        if (boost.gt(1000)) boost = boost.div(1000).log10().add(1).mul(1000);
        if (boost.gt(1e10)) boost = boost.div(1e10).log10().add(1).mul(1e10);

        return boost;
    }

    propagateBoost() {
        this.boost = new Decimal(1);
        if (this.child_left != undefined) this.child_left.propagateBoost();
        if (this.child_right != undefined) this.child_right.propagateBoost();
        if (this.parent_layer != undefined) this.parent_layer.boost = this.parent_layer.boost.mul(this.boost).mul(this.getBoostValue());
    }

    processTimedelta(delta) {
        this.points = this.points.add(this.calculateProduction(this.depth == 0 ? 1 : 0).mul(delta / 1000));
        if (this.right_branch) this.points = this.points.add(this.prestigeGain().mul(delta / 1000));
        if ((this.child_left == undefined || this.child_right == undefined) && this.points.gt(this.final_goal)) {
            player.layers.push(new Layer(player.seed, player.layers.length, this, true));
            player.layers.push(new Layer(player.seed, player.layers.length, this, false));
        }
    }

    screenUpdate() {
        this.unlockReq.style.visibility = this.child_left === undefined || this.child_right === undefined ? "" : "hidden";
        let purchaseAvailable = Object.values(this.upgrades).some(upg => !upg.bought && upg.canBuy()) ||
                                (this.parent_layer != undefined && this.child_left != undefined && this.child_left.points.gte(this.child_left.final_goal) && !this.left_branch) ||
                                (this.parent_layer != undefined && this.child_right != undefined && this.child_right.points.gte(this.child_right.final_goal) && !this.right_branch);
        let ascensionAvailable = Object.values(this.upgrades).some(upg => !upg.bought && !upg.canBuy() && this.points.add(this.prestigeGain()).gte(upg.cost));
        this.nodeEl.className = `tree-node${ascensionAvailable ? ' ascensionAvailable' : ''}${purchaseAvailable ? ' purchaseAvailable' : ''}`;
    }

    purchaseAvailable(){
        return Object.values(this.upgrades).some(upg => !upg.bought && upg.canBuy()) ||
        (this.parent_layer != undefined && this.child_left != undefined && this.child_left.points.gte(this.child_left.final_goal) && !this.left_branch) ||
        (this.parent_layer != undefined && this.child_right != undefined && this.child_right.points.gte(this.child_right.final_goal) && !this.right_branch);
    }

    ascensionAvailable(){
        return Object.values(this.upgrades).some(upg => !upg.bought && !upg.canBuy() && this.points.add(this.prestigeGain()).gte(upg.cost));
    }

    screenUpdateCurrent() {
        let layer_container = document.getElementById('layer_info');

        layer_container.style.setProperty("--color-layer", formAsRGB(this.color));

        layer_container.getElementsByClassName('type')[0].textContent = this.name;
        if (player.isChinese&&this.name == 'Original') layer_container.getElementsByClassName('type')[0].textContent = '原版游戏'
        layer_container.getElementsByClassName('point-amount')[0].textContent = formatNumber(this.points, true, true);
        layer_container.getElementsByClassName('gain-amount')[0].textContent = formatNumber(this.calculateProduction(this.depth == 0 ? 1 : 0), true);

        layer_container.getElementsByClassName('boost-from-value')[0].textContent = formatNumber(this.boost, true);
        layer_container.getElementsByClassName('boost-to-value')[0].textContent = formatNumber(this.getBoostValue(), true);

        if (this.parent_layer == undefined) layer_container.getElementsByClassName('boost-to')[0].style.visibility = "hidden";
        else layer_container.getElementsByClassName('boost-to')[0].style.visibility = "";

        if (this.parent_layer == undefined) layer_container.getElementsByClassName('prestige')[0].style.visibility = "hidden";
        else layer_container.getElementsByClassName('prestige')[0].style.visibility = "";

        if (this.parent_layer == undefined || this.child_left == undefined) document.getElementById("qol_left").style.visibility = "hidden";
        else {
            document.getElementById("qol_left").style.visibility = "";
            document.getElementById("qol_left").disabled = this.child_left.points.lt(this.child_left.final_goal);
            if (this.left_branch) document.getElementById("qol_left").classList.add("complete");
            else document.getElementById("qol_left").classList.remove("complete");
            layer_container.getElementsByClassName('left-child-req')[0].textContent = formatNumber(this.child_left.final_goal, true);
            layer_container.getElementsByClassName('left-child-name')[0].textContent = this.child_left.points_name + (player.isChinese?" 点数":" points");
        }

        if (this.parent_layer == undefined || this.child_right == undefined) document.getElementById("qol_right").style.visibility = "hidden";
        else {
            document.getElementById("qol_right").style.visibility = "";
            document.getElementById("qol_right").disabled = this.child_right.points.lt(this.child_right.final_goal);
            if (this.right_branch) document.getElementById("qol_right").classList.add("complete");
            else document.getElementById("qol_right").classList.remove("complete");
            layer_container.getElementsByClassName('right-child-req')[0].textContent = formatNumber(this.child_right.final_goal, true);
            layer_container.getElementsByClassName('right-child-name')[0].textContent = this.child_right.points_name + (player.isChinese?" 点数":" points");
        }

        if (this.canPrestige()) {
            layer_container.getElementsByClassName('prestige')[0].disabled = false;
            layer_container.getElementsByClassName('cannot-prestige')[0].style.display = "none";
            layer_container.getElementsByClassName('can-prestige')[0].style.display = "";
        }
        else {
            layer_container.getElementsByClassName('prestige')[0].disabled = true;
            layer_container.getElementsByClassName('cannot-prestige')[0].style.display = "";
            layer_container.getElementsByClassName('can-prestige')[0].style.display = "none";
        }

        for (let element of layer_container.getElementsByClassName('prestige-need')) {
            element.textContent = formatNumber(this.prestigeNeed().add(1), true, true);
        }

        if (this.prestigeGain().gt(100)) layer_container.getElementsByClassName('next-at')[0].style.display = "none";
        else layer_container.getElementsByClassName('next-at')[0].style.display = "";

        layer_container.getElementsByClassName('prestige-gain')[0].textContent = formatNumber(this.prestigeGain(), true, true);

        for (let key of Object.keys(this.upgrades)) {
            this.upgrades[key].screenUpdate();
        }

        for (let element of layer_container.getElementsByClassName('point-name')) {
            if (this.points_name == "") element.textContent = player.isChinese?"点数":"points";
            else element.textContent = this.points_name + (player.isChinese?" 点数":" points");
        }

        for (let element of layer_container.getElementsByClassName('prev-point-name')) {
            if (this.parent_layer == undefined) element.textContent = player.isChinese?"愚人节快乐！":"April fools";
            else if (this.parent_layer.points_name == "") element.textContent = player.isChinese?"点数":"points";
            else element.textContent = this.parent_layer.points_name + (player.isChinese?" 点数":" points");
        }
    }

    selectLayer(forceZoom, instant = false) {
        let layer_container = document.getElementById('layer_info');
        let upgrade_container = layer_container.getElementsByClassName('upgrades-list')[0];

        let upgrade_elements = "";
        for (let key of Object.keys(this.upgrades)) {
            if (player.isChinese) upgrade_elements += '<button class="upgrade" id="' + key + '" onclick="player.current_layer.upgrades[this.id].buy()"><div class="content"><p class="upgrade-name">&nbsp;</p><p class="upgrade-desc">' + this.upgrades[key].getDescCode() + '</p><p class="divider"></p><p class="upgrade-cost">花费: <span class="cost"></span> <span class="point-name"></span></p></div></button>';
            else upgrade_elements += '<button class="upgrade" id="' + key + '" onclick="player.current_layer.upgrades[this.id].buy()"><div class="content"><p class="upgrade-name">&nbsp;</p><p class="upgrade-desc">' + this.upgrades[key].getDescCode() + '</p><p class="divider"></p><p class="upgrade-cost">Cost: <span class="cost"></span> <span class="point-name"></span></p></div></button>';
        }

        upgrade_container.innerHTML = upgrade_elements;

        const shouldZoom = player.current_layer === this || player.singleclick;
        player.current_layer = this;

        if (shouldZoom || forceZoom === true) {
            const treeContainer = document.getElementById("tree-container").getBoundingClientRect();
            const zoom = Decimal.pow(2, this.depth).times(player.zoomModifier).toNumber();
            const nodeRect = this.el.getBoundingClientRect();
            const rootRect = player.layers[0].el.getBoundingClientRect();
            const x = (rootRect.x + rootRect.width / 2 - nodeRect.x - nodeRect.width / 2) / panzoom.getScale() + treeContainer.width / 2;
            const y = (rootRect.y + rootRect.height / 2 - nodeRect.y - nodeRect.height / 2) / panzoom.getScale() + treeContainer.height / 2 / zoom;
            panzoom.zoom(zoom, { animate: !instant && player.animations });
            panzoom.pan(x, y, { animate: !instant && player.animations });
        }

        screenUpdate();
    }

    canPrestige() {
        return this.prestigeGain().gt(0);
    }

    prestigeGain() {
        if (this.parent_layer == undefined) return new Decimal(0);

        return this.calculateProduction(this.parent_layer.points.max(1).log(this.parent_layer.final_goal).pow(Math.log2(Math.max(1, this.depth) + 1)), this.points, true).floor();
    }

    prestigeNeed() {
        if (this.parent_layer == undefined) return new Decimal(0);

        return this.parent_layer.final_goal.pow(this.calculateReverseProduction(this.prestigeGain().add(1), this.points, true).pow(1 / Math.log2(Math.max(1, this.depth) + 1)));
    }

    prestige() {
        this.points = this.points.add(this.prestigeGain()).round();

        if (this.parent_layer != undefined) this.parent_layer.reset();
        screenUpdate();
    }

    reset() {
        if (!this.left_branch) {
            for (let key of Object.keys(this.upgrades)) {
                this.upgrades[key].bought = false;
            }
        }
        this.points = new Decimal(0);
        //if (this.parent_layer != undefined) this.parent_layer.reset();
    }

    buyLeft() {
        if (this.child_left == undefined) return;
        if (this.child_left.points.lt(this.child_left.final_goal)) return;
        if (this.left_branch) return;
        this.left_branch = true;
        this.child_left.points = this.child_left.points.sub(this.child_left.final_goal);
    }

    buyRight() {
        if (this.child_right == undefined) return;
        if (this.child_right.points.lt(this.child_right.final_goal)) return;
        if (this.right_branch) return;
        this.right_branch = true;
        this.child_right.points = this.child_right.points.sub(this.child_right.final_goal);
    }

    save() {
        let data = [];
        data.push(this.id);
        if (this.parent_layer != undefined) data.push(this.parent_layer.id);
        else data.push(-1);
        data.push(this.is_ngminus);
        data.push([this.points.sign, this.points.layer, this.points.mag]);
        data.push([this.upgrade_time.sign, this.upgrade_time.layer, this.upgrade_time.mag]);
        data.push([this.final_goal.sign, this.final_goal.layer, this.final_goal.mag]);
        data.push(this.name);
        data.push(this.points_name);
        data.push(this.depth);
        data.push(this.color);

        let upgrade_data = [];
        for (let key of Object.keys(this.upgrades)) upgrade_data.push(this.upgrades[key].save());

        data.push(upgrade_data);

        data.push(this.left_branch);
        data.push(this.right_branch);
        return data;
    }

    load(player, data) {
        this.id = data[0];
        if (data[1] == -1) this.parent_layer = undefined;
        else this.parent_layer = player.layers[data[1]];
        this.is_ngminus = data[2];
        this.points.fromComponents(data[3][0], data[3][1], data[3][2]);
        this.upgrade_time.fromComponents(data[4][0], data[4][1], data[4][2]);
        this.final_goal.fromComponents(data[5][0], data[5][1], data[5][2]);
        this.name = data[6];
        this.points_name = data[7];
        this.depth = data[8];
        this.coord = 0;
        this.color = data[9];

        this.upgrades = {};
        for (let upg of data[10]) {
            this.upgrades[upg[0]] = new Upgrade();
            this.upgrades[upg[0]].load(this, upg);
        }

        if (data.length > 11) this.left_branch = data[11];
        if (data.length > 12) this.right_branch = data[12];

        this.child_left = undefined;
        this.child_right = undefined;

        if (this.parent_layer != undefined) {
            if (this.is_ngminus) this.parent_layer.child_left = this;
            else this.parent_layer.child_right = this;

            this.coord = 2 * this.parent_layer.coord;
            if (!this.is_ngminus) this.coord += 1;
            this.coord = this.coord % (2 ** 32);
        }

        this.nodeEl.style.backgroundColor = formAsRGB(this.color);
        if (this.parent_layer === undefined) {
            this.el.style.top = "0px";
            this.el.style.left = "0px";
            this.el.style.transform = "translate(-50%, -50%)";
            document.getElementById("tree").appendChild(this.el);
        } else {
            this.el.style.top = "15em";
            this.el.style.left = (this.is_ngminus ? "-" : "") + "10em";
            this.el.style.transform = "";
            this.parent_layer.el.appendChild(this.el);
        }

        this.label.innerText = this.parent_layer === undefined ? "OG" : this.points_name.slice(0, 3);

        this.unlockReq.innerText = player.isChinese?`达到 ${formatNumber(this.final_goal)} ${this.points_name ? this.points_name + " 点数" : "点数"} 以解锁`:`Get ${formatNumber(this.final_goal)} ${this.points_name ? this.points_name + " points" : "points"} to unlock`;
        this.unlockReq.setAttribute('layerid',this.id)
    }
};
