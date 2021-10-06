/* global DragDrop, duplicate, expandObject, flattenObject, FormDataExtended, game, getType, ItemSheet, mergeObject */

import { CoC7Chat } from '../../chat.js'
import { chatHelper } from '../../chat/helper.js'
import { CoC7Check } from '../../check.js'

export class CoC7ChaseSheet extends ItemSheet {
  // constructor( ...args) {
  //  super( ...args);
  // }

  /**
   * Extend and override the default options used by the Simple Item Sheet
   * @returns {Object}
   */
  static get defaultOptions () {
    const options = mergeObject(super.defaultOptions, {
      classes: ['coc7', 'sheetV2', 'item', 'chase'],
      width: 550,
      height: 500,
      resizable: true,
      tabs: [
        {
          navSelector: '.sheet-nav',
          contentSelector: '.sheet-body',
          initial: 'participants'
        }
      ]
    })

    return options

    // closeOnSubmit: false,
    // submitOnClose: true,
  }

  /* -------------------------------------------- */

  /** @override */
  get template () {
    return 'systems/CoC7/templates/items/chase.html'
  }

  static get type () {
    return 'coc7ChaseSheet'
  }

  /** @override */
  getData (options = {}) {
    const data = super.getData(options)

    /** MODIF: 0.8.x **/
    const itemData = data.data
    data.data = itemData.data // MODIF: 0.8.x data.data
    /*****************/

    data.participants = this.participants
    data.preys = this.preys
    data.chasers = this.chasers

    // data.byDex = duplicate(data.participants).sort((a, b) => a.dex - b.dex)

    data.preysMinMov = data.preys.length
      ? data.preys.reduce((prev, current) =>
          prev.adjustedMov < current.adjustedMov ? prev : current
        ).adjustedMov
      : -1

    data.preysMaxMov = data.preys.length
      ? data.preys.reduce((prev, current) =>
          prev.adjustedMov > current.adjustedMov ? prev : current
        ).adjustedMov
      : -1

    data.chasersMinMov = data.chasers.length
      ? data.chasers.reduce((prev, current) =>
          prev.adjustedMov < current.adjustedMov ? prev : current
        ).adjustedMov
      : -1

    data.chasersMaxMov = data.chasers.length
      ? data.chasers.reduce((prev, current) =>
          prev.adjustedMov > current.adjustedMov ? prev : current
        ).adjustedMov
      : -1

    data.chasers.forEach(p => {
      if (p.adjustedMov < data.preysMinMov) p.tooSlow()
      else p.includeInChase()
      p.fastest = p.adjustedMov == data.chasersMaxMov
      p.slowest = p.adjustedMov == data.chasersMinMov
    })

    data.preys.forEach(p => {
      if (p.adjustedMov > data.chasersMaxMov) p.escaped()
      else p.includeInChase()
      p.fastest = p.adjustedMov == data.preysMaxMov
      p.slowest = p.adjustedMov == data.preysMinMov
    })

    data.locations = this.locations
    data.allHaveValidMov = this.allHaveValidMov
    data.activeLocation = this.activeLocation
    data.previousLocation = this.previousLocation
    data.nextLocation = this.nextLocation

    return data
  }

  get participants () {
    const pList = []
    this.item.data.data.participants.forEach(p => {
      pList.push(new _participant(p))
      p.index = pList.length - 1
    })
    pList.sort((a, b) => a.adjustedMov - b.adjustedMov)
    return pList
    // return this.item.data.data.participants
  }

  get preys () {
    return (
      this.participants
        .filter(p => !p.isChaser && p.isValid)
        .sort((a, b) => a.adjustedMov - b.adjustedMov) || []
    )
  }

  get chasers () {
    return (
      this.participants
        .filter(p => p.isChaser && p.isValid)
        .sort((a, b) => a.adjustedMov - b.adjustedMov) || []
    )
  }

  findMinMov (list) {
    if (!list?.length) return -1
    return list.reduce((prev, current) =>
      prev.adjustedMov < current.adjustedMov ? prev : current
    ).adjustedMov
  }

  findMaxMov (list) {
    if (!list?.length) return -1
    return list.reduce((prev, current) =>
      prev.adjustedMov > current.adjustedMov ? prev : current
    ).adjustedMov
  }

  get locations () {
    if (
      !this.item.data.data.locations.list ||
      0 === this.item.data.data.locations.list.length
    )
      return undefined
    const locations = this.item.data.data.locations.list
    locations[0].first = true

    for (let index = 0; index < locations.length; index++) {
      const classes = []
      const location = locations[index]
      if (!location.name) classes.push('empty')
      if (location.active) classes.push('active')
      location.cssClasses = classes.join(' ')
    }

    if (locations.length > 1) locations[locations.length - 1].last = true

    return locations
  }

  get activeLocation () {
    if (!this.locations) return undefined
    return this.locations.find(l => l.active)
  }

  get previousLocation () {
    if( !this.locations) return undefined
    const activeIndex = this.locations.findIndex( l => l.active)
    if( -1 == activeIndex) return undefined
    if( 0 == activeIndex) return undefined
    return this.locations[activeIndex - 1]
  }

  get nextLocation () {
    if( !this.locations) return undefined
    const activeIndex = this.locations.findIndex( l => l.active)
    if( -1 == activeIndex) return undefined
    if( activeIndex == this.locations.length - 1) return undefined
    return this.locations[activeIndex + 1]
  }

  get allHaveValidMov () {
    return this.participants.every(e => e.hasValidMov)
  }

  get initTrack () {
    if (this.allHaveValidMov) {
      const participants = this.participants
    } else return undefined
  }

  /** @override */
  activateListeners (html) {
    super.activateListeners(html)

    html.on('dblclick', '.open-actor', CoC7Chat._onOpenActor.bind(this))

    html
      .find('.participant')
      .on('dragenter', event => this._onDragEnterParticipant(event))
    html
      .find('.participant')
      .on('dragover', event => this._onDragEnterParticipant(event))
    html
      .find('.participant')
      .on('dragleave', event => this._onDragLeaveParticipant(event))
    html
      .find('.participant')
      .on('drop', event => this._onDragLeaveParticipant(event))

    html.find('.p-side').click(this._onChangeSide.bind(this))
    html.find('.delete-participant').click(this._onDeleteParticipant.bind(this))
    html.find('.reset-roll').click(this._onResetRoll.bind(this))
    html.find('.delete-driver').click(this._onDeleteDriver.bind(this))

    html
      .find('.new-participant')
      .on('dragenter', event => this._onDragEnterParticipant(event))
    html
      .find('.new-participant')
      .on('dragover', event => this._onDragEnterParticipant(event))
    html
      .find('.new-participant')
      .on('dragleave', event => this._onDragLeaveParticipant(event))
    html
      .find('.new-participant')
      .on('drop', event => this._onDragLeaveParticipant(event))

    html.find('.add-sign').click(this._onAddParticipant.bind(this))

    html.find('.roll-participant').click(this._onRollParticipant.bind(this))

    html.find('.button').click(this._onButtonClick.bind(this))

    html.find('.name-container').click(this._onLocationClick.bind(this))

    const participantDragDrop = new DragDrop({
      dropSelector: '.participant',
      callbacks: { drop: this._onDropParticipant.bind(this) }
    })
    participantDragDrop.bind(html[0])

    const newParticipantDragDrop = new DragDrop({
      dropSelector: '.new-participant',
      callbacks: { drop: this._onAddParticipant.bind(this) }
    })
    newParticipantDragDrop.bind(html[0])
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /** @override */
  _getSubmitData (updateData = {}) {
    // Create the expanded update data object
    const fd = new FormDataExtended(this.form, { editors: this.editors })
    let data = fd.toObject()
    if (updateData) data = mergeObject(data, updateData)
    else data = expandObject(data)

    if (data.data.participants) {
      const participants = duplicate(this.item.data.data.participants)
      // Handle participants array
      for (const [k, v] of Object.entries(data.data.participants)) {
        const index = participants.findIndex(p => p.uuid == k)
        if (-1 == index) ui.notifications.error('Participant table corrupted')
        else {
          const original = participants[index]
          const cleaned = clean(v)
          mergeObject(original, cleaned)
          participants[index] = original
        }
      }

      data.data.participants = participants
    }

    if (data.locations) {
      const locations = duplicate(this.item.data.data.locations.list)
      //Handle locations list
      for (const [key, value] of Object.entries(data.locations)) {
        const locationIndex = locations.findIndex(l => l.uuid == key)
        if (-1 == locationIndex)
          ui.notifications.error('Locations table corrupted')
        else {
          const originalLocation = locations[locationIndex]
          const cleaned = clean(value)
          mergeObject(originalLocation, cleaned)
          locations[locationIndex] = originalLocation
        }
      }

      delete data.locations
      data.data.locations = { list: locations }
    }
    // const participants = data.data?.participants;
    // if( participants) data.data.participants = Object.values( participants).map( p => clean(p));

    // Return the flattened submission data
    return flattenObject(data)
  }

  /** @override */
  // async _onSubmit(...args) {
  //  await super._onSubmit(...args);
  // }

  async _updateObject (event, formData) {
    const target = event.currentTarget
    const override = target?.dataset?.override === 'true'
    if (override) {
      const [, type, uuid, subType, data] = target.name.split('.')
      const index = this.findParticipantIndex(uuid)
      if (
        type === 'participants' &&
        !isNaN(index) &&
        subType === 'speed-check'
      ) {
        if (data === 'name') {
          // Changing name will remove all other ref !
          const participants = this.item.data.data.participants
            ? duplicate(this.item.data.data.participants)
            : []
          if (participants[index].speedCheck) {
            delete participants[index].speedCheck.id
            delete participants[index].speedCheck.type
          } else participants[index].speedCheck = {}
          participants[index].speedCheck.name = target.value
          await this.item.update({ 'data.participants': participants })
          return
        }
      }
    }
    super._updateObject(event, formData)
  }

  findParticipantIndex (uuid) {
    return this.item.data.data.participants.findIndex(p => p.uuid == uuid)
  }

  findLocationIndex (uuid) {
    return this.item.data.data.locations.list.findIndex(p => p.uuid == uuid)
  }

  findIndex (list, uuid) {
    return list.findIndex(p => p.uuid == uuid)
  }

  async updateLocationsList (list) {
    //Remove all unnecessary items (cssClass, )
    const updatedList = duplicate(list)
    updatedList.forEach(l => {
      // delete l.active
      delete l.cssClasses
      delete l.first
      delete l.last
    })
    await this.item.update({ 'data.locations.list': updatedList })
  }

  async _onLocationClick (event) {
    const target = event.currentTarget
    const active = target.classList.contains('active')
    const locations = duplicate(this.item.data.data.locations.list)
    locations.forEach(l => (l.active = false))
    const locationElement = target.closest('.location')
    const uuid = locationElement.dataset.uuid
    const locationIndex = this.findIndex(locations, uuid)
    if (!active) locations[locationIndex].active = true
    await this.updateLocationsList(locations)
  }

  async _onButtonClick (event) {
    const target = event.currentTarget
    const action = target.dataset?.action
    if (!action) return
    switch (action) {
      case 'init':
        if (
          !isNaN(this.item.data.data.locations.total) &&
          this.item.data.data.locations.total > 0
        ) {
          const locations = Array.apply(
            null,
            Array(this.item.data.data.locations.total)
          ).map(function () {
            return { uuid: foundry.utils.randomID(16) }
          })
          locations[0].name = 'Start'
          if (locations.length > 1) locations[locations.length - 1].name = 'End'
          await this.updateLocationsList(locations)
        }

        break
      case 'reset':
        await this.updateLocationsList([])
        break

      default:
        break
    }
  }

  async _onDropParticipant (event) {
    const target = event.currentTarget
    const uuid = target.dataset?.uuid
    if (!index) return
    const dataString = event.dataTransfer.getData('text/plain')
    const data = JSON.parse(dataString)
    await this.alterParticipant(data, uuid)
  }

  async _onAddParticipant (event) {
    let data = {}
    if (event.dataTransfer) {
      const dataString = event.dataTransfer.getData('text/plain')
      data = JSON.parse(dataString)
    }
    await this.addParticipant(data)
  }

  async _onRollParticipant (event) {
    const target = event.currentTarget
    const participantElement = target.closest('.participant')
    const uuid = participantElement.dataset.uuid
    const index = this.findParticipantIndex(uuid)
    const participants = this.item.data.data.participants
      ? duplicate(this.item.data.data.participants)
      : []

    const participant = new _participant(participants[index])
    if (participant.speedCheck.refSet) {
      const roll = new CoC7Check()
      roll.parent = this.item.uuid
      participant.data.rolled = true
      participant.data.rollUuid = roll.uuid
      roll.actor = participant.actor.actorKey
      if (!event.shiftKey && participant.actor.player) {
        roll.standby = true
        roll.standbyText = 'CoC7.Chase'
        roll.standbyRightIcon = 'systems/CoC7/assets/icons/running-solid.svg'
      }

      if (participant.speedCheck.isCharacteristic) {
        await roll.rollCharacteristic(participant.speedCheck.ref.key)
        await roll.toMessage()
        participant.data.speedCheck.rollDataString = roll.JSONRollString
      } else if (participant.speedCheck.isSkill) {
        roll.skill = participant.speedCheck.ref
        await roll.roll()
        await roll.toMessage()
        participant.data.speedCheck.rollDataString = roll.JSONRollString
      } else if (participant.speedCheck.isAttribute) {
        await roll.rollAttribute(participant.speedCheck.ref.key)
        await roll.toMessage()
        participant.data.speedCheck.rollDataString = roll.JSONRollString
      }
    } else if (participant.speedCheck.score) {
      const rollData = {
        rawValue: participant.speedCheck.score,
        displayName: participant.speedCheck.name,
        actorName: participant.name ? participant.name : undefined
      }
      if (participant.hasActor) rollData.actor = participant.actor.actorKey
      const roll = CoC7Check.create(rollData)
      roll.parent = this.item.uuid
      await roll.roll()
      await roll.toMessage()
      participant.data.speedCheck.rollDataString = roll.JSONRollString
      participant.data.rolled = true
      participant.data.rollUuid = roll.uuid
    }

    await this.item.update({ 'data.participants': participants })
  }

  async _onDragEnterParticipant (event) {
    const target = event.currentTarget
    target.classList.add('drag-over')
  }

  async _onDragLeaveParticipant (event) {
    const target = event.currentTarget
    target.classList.remove('drag-over')
  }

  async _onChangeSide (event) {
    // const test = await fromUuid( 'Scene.wh7SLuvIOpcQyb8S.Token.nCdoCyoiudtjrNku');
    // const itemTest = await fromUuid( 'Item.plIEmNRP6O7PveNv.roll.q2sAzsHt4FsqsdfD');

    const target = event.currentTarget
    const participant = target.closest('.participant')
    const uuid = participant.dataset.uuid
    const index = this.findParticipantIndex(uuid)
    const participants = this.item.data.data.participants
      ? duplicate(this.item.data.data.participants)
      : []
    participants[index].chaser = !participants[index].chaser
    await this.item.update({ 'data.participants': participants })
  }

  async _onDeleteDriver (event) {
    const target = event.currentTarget
    const driver = target.closest('.driver')
    const uuid = driver.dataset.uuid
    const index = this.findParticipantIndex(uuid)
    const participants = this.item.data.data.participants
      ? duplicate(this.item.data.data.participants)
      : []
    const participant = participants[index]
    delete participant.actorKey
    await this.item.update({ 'data.participants': participants })
  }

  async _onDeleteParticipant (event) {
    const target = event.currentTarget
    const participant = target.closest('.participant')
    const uuid = participant.dataset.uuid
    const index = this.findParticipantIndex(uuid)
    const participants = this.item.data.data.participants
      ? duplicate(this.item.data.data.participants)
      : []
    participants.splice(index, 1)
    await this.item.update({ 'data.participants': participants })
  }

  async _onResetRoll (event) {
    const target = event.currentTarget
    const participant = target.closest('.participant')
    const uuid = participant.dataset.uuid
    const index = this.findParticipantIndex(uuid)
    const participants = this.item.data.data.participants
      ? duplicate(this.item.data.data.participants)
      : []
    delete participants[index].speedCheck.rollDataString
    await this.item.update({ 'data.participants': participants })
  }

  async alterParticipant (data, uuid) {
    const actorKey =
      data.sceneId && data.tokenId
        ? `${data.sceneId}.${data.tokenId}`
        : data.type === 'Actor'
        ? data.id
        : data.actorId || data.actorKey
    const participant = {}
    const actor = chatHelper.getActorFromKey(actorKey)
    if (actor) {
      if (actor.data.type === 'vehicle') participant.vehicleKey = actorKey
      else participant.actorKey = actorKey
    }

    switch (data.type?.toLowerCase()) {
      case 'actor':
        break
      case 'item':
        participant.speedCheck = {
          id: data.data?._id || data.id,
          type: 'item'
        }
        break
      case 'characteristic':
        participant.speedCheck = {
          id: data.name,
          type: 'characteristic'
        }
        break
      case 'attribute':
        participant.speedCheck = {
          id: data.name,
          type: 'attribute'
        }
        break

      default:
        break
    }

    const participants = this.item.data.data.participants
      ? duplicate(this.item.data.data.participants)
      : []
    const index = this.findParticipantIndex(uuid)
    const oldParticipant = participants[index]
    if (oldParticipant.mov) delete oldParticipant.mov
    mergeObject(oldParticipant, participant)
    await this.item.update({ 'data.participants': participants })
  }

  async addParticipant (data) {
    const actorKey =
      data.sceneId && data.tokenId
        ? `${data.sceneId}.${data.tokenId}`
        : data.actorId || data.actorKey || data.id
    const participant = {}
    const actor = chatHelper.getActorFromKey(actorKey)
    if (actor) {
      if (actor.data.type === 'vehicle') participant.vehicleKey = actorKey
      else participant.actorKey = actorKey
    }

    // const participant = {
    //  actorKey : (data.sceneId && data.tokenId)?`${data.sceneId}.${data.tokenId}`:data.actorId||data.actorKey||data.id
    // };
    // const actor = chatHelper.getActorFromKey( participant.actorKey);
    // if( !actor) delete participant.actorKey;

    switch (data.type?.toLowerCase()) {
      case 'actor':
        break
      case 'item':
        if (data.id) {
          const item = game.items.get(data.id)
          if (item?.data?.type !== 'skill') return
        }

        participant.speedCheck = {
          id: data.data?._id || data.id,
          type: 'item'
        }
        break
      case 'characteristic':
        participant.speedCheck = {
          id: data.name,
          type: 'characteristic'
        }
        break
      case 'attribute':
        participant.speedCheck = {
          id: data.name,
          type: 'attribute'
        }
        break

      default:
        break
    }

    const participants = this.item.data.data.participants
      ? duplicate(this.item.data.data.participants)
      : []

    let unique = false
    while (!unique) {
      participant.uuid = foundry.utils.randomID(16)
      unique = 0 === participants.filter(p => p.uuid == participant.uuid).length
    }

    participants.push(participant)
    await this.item.update({ 'data.participants': participants })
  }

  async updateRoll (rollString) {
    if (game.user.isGM) {
      const roll = CoC7Check.fromRollString(rollString)
      const participants = this.item.data.data.participants
        ? duplicate(this.item.data.data.participants)
        : []
      const index = participants.findIndex(p => p.rollUuid === roll.uuid)
      if (index >= 0) {
        participants[index].speedCheck.rollDataString = roll.JSONRollString
        await this.item.update({ 'data.participants': participants })
      }
    } else {
      const data = {
        data: rollString,
        type: 'invoke',
        method: 'updateRoll',
        item: this.item.uuid
      }
      game.socket.emit('system.CoC7', data)
    }
  }
}

export function clean (obj) {
  for (const propName in obj) {
    const tp = getType(obj[propName])
    if (tp === 'Object') {
      obj[propName] = clean(obj[propName])
    }

    if (tp === 'Object' && !Object.entries(obj[propName]).length) {
      obj[propName] = null
    } else if (tp === 'string' && !obj[propName].length) {
      obj[propName] = null
    } else if (tp === 'string' && !isNaN(Number(obj[propName]))) {
      obj[propName] = Number(obj[propName])
    }
  }
  return obj
}

export class _participant {
  constructor (data = {}) {
    this.data = data
  }

  get actor () {
    if (!this._actor) {
      this._actor = chatHelper.getActorFromKey(this.data.actorKey)
    }
    return this._actor
  }

  get isActor () {
    return this.hasActor || this.hasVehicle
  }

  get key () {
    if (this.hasVehicle) return this.vehicle.actorKey
    if (this.hasActor) return this.actor.actorKey
    return undefined
  }

  get icon () {
    if (!this.isActor) {
      return 'systems/CoC7/assets/icons/question-circle-regular.svg'
    }
    if (this.hasVehicle) return this.vehicle.img
    if (this.hasActor) return this.actor.img
    return undefined
  }

  get driver () {
    if (!this._driver) {
      this._driver = chatHelper.getActorFromKey(this.data.actorKey)
    }
    return this._driver
  }

  get vehicle () {
    if (this.data.vehicleKey) {
      this._vehicle = chatHelper.getActorFromKey(this.data.vehicleKey)
    }
    return this._vehicle
  }

  get hasActor () {
    return !!this.actor
  }

  get hasVehicle () {
    return !!this.vehicle
  }

  get name () {
    if (this.hasVehicle) return this.vehicle.name
    if (this.hasActor) return this.actor.name
    return this.data.name || undefined
  }

  get mov () {
    if (!this.data.mov) {
      if (this.hasVehicle) this.data.mov = this.vehicle.mov
      else if (this.hasActor) this.data.mov = this.actor.mov
    }

    if (this.data.mov) {
      if (!isNaN(Number(this.data.mov))) this.data.hasValidMov = true
      else {
        this.data.hasValidMov = false
        this.data.mov = undefined
      }
    }

    return this.data.mov
  }

  get uuid () {
    return this.data.uuid
  }

  get dex () {
    if (!this.data.dex) {
      if (this.hasVehicle && this.hasDriver)
        this.data.dex = this.driver.characteristics.dex.value
      else if (this.hasActor)
        this.data.dex = this.actor.characteristics.dex.value
    }

    if (this.data.dex) {
      if (!isNaN(Number(this.data.dex))) this.data.hasValidDex = true
      else {
        this.data.hasValidDex = false
        this.data.dex = 0
      }
    }

    return this.data.dex
  }

  get isChaser () {
    return !!this.data.chaser
  }

  get isValid () {
    return this.hasValidDex && this.hasValidMov
  }

  get hasValidDex () {
    return !isNaN(Number(this.data.dex))
  }

  get hasValidMov () {
    return !isNaN(Number(this.data.mov))
  }

  get hasDriver () {
    return this.hasVehicle && this.hasActor
  }

  get movAdjustment () {
    if (this.data.speedCheck?.rollDataString) {
      const roll = CoC7Check.fromRollString(this.data.speedCheck.rollDataString)
      if (roll) {
        if (!roll.standby) {
          if (roll.successLevel >= CoC7Check.successLevel.extreme) return 1
          else if (roll.failed) return -1
        }
      }
    }
    return 0
  }

  get adjustedMov () {
    if (typeof this.mov === 'undefined') return undefined
    if (isNaN(Number(this.mov))) return undefined
    return Number(this.mov) + this.movAdjustment
  }

  get hasMovAdjustment () {
    return this.hasBonusMov || this.hasMalusMov
  }

  get hasBonusMov () {
    if (this.data.movAdjustment > 0) return true
    return false
  }

  get hasMalusMov () {
    if (this.data.movAdjustment < 0) return true
    return false
  }

  // get options(){
  //  return {
  //    exclude: [],
  //    excludeStartWith: '_'
  //  };
  // }

  // get dataString(){
  //  return JSON.stringify(this, (key,value)=>{
  //    if( null === value) return undefined;
  //    if( this.options.exclude?.includes(key)) return undefined;
  //    if( key.startsWith(this.options.excludeStartWith)) return undefined;
  //    return value;
  //  });
  // }

  tooSlow () {
    this.data.excluded = true
  }

  includeInChase () {
    this.data.excluded = false
    this.data.escaped = false
  }

  escaped () {
    this.data.escaped = true
  }

  set slowest (x) {
    this.data.slowest = x
  }

  set fastest (x) {
    this.data.fastest = x
  }

  get cssClass () {
    const cssClasses = []
    if (this.isChaser) cssClasses.push('chaser')
    else cssClasses.push('prey')
    if (this.data.excluded) cssClasses.push('excluded', 'too_slow')
    if (this.data.escaped) cssClasses.push('escaped')
    if (this.data.fastest) cssClasses.push('fastest')
    if (this.data.slowest) cssClasses.push('slowest')
    return cssClasses.join(' ')
  }

  get speedCheck () {
    const check = {}
    if (this.data.speedCheck?.name) check.name = this.data.speedCheck.name
    if (this.data.speedCheck?.score) check.score = this.data.speedCheck.score
    check.cssClasses = ''
    if (this.data.speedCheck?.rollDataString) {
      check.roll = CoC7Check.fromRollString(this.data.speedCheck.rollDataString)
      if (check.roll) {
        if (!check.roll.standby || check.roll.hasCard) {
          check.rolled = true
          check.inlineRoll = check.roll.inlineCheck.outerHTML
          check.cssClasses += 'rolled'
          if (!check.roll.standby) {
            if (check.roll.successLevel >= CoC7Check.successLevel.extreme) {
              check.modifierCss = 'upgrade'
            } else if (check.roll.failed) check.modifierCss = 'downgrade'
            if (
              check.roll.successLevel >= CoC7Check.successLevel.extreme ||
              check.roll.failed
            ) {
              check.hasModifier = true
            }
          }
        }
      }
    }
    if (this.hasActor) {
      check.options = []
      ;['con'].forEach(c => {
        const characterisitc = this.actor.getCharacteristic(c)
        if (characterisitc?.value) check.options.push(characterisitc.label)
      })

      this.actor.driveSkills.forEach(s => {
        check.options.push(s.name)
      })

      this.actor.pilotSkills.forEach(s => {
        check.options.push(s.name)
      })
      check.hasOptions = !!check.options.length

      if (this.data.speedCheck?.id) {
        let item = this.actor.find(this.data.speedCheck.id)
        if (!item) {
          const gameItem = game.items.get(this.data.speedCheck.id)
          if (gameItem) item = this.actor.find(gameItem.name)
        }

        if (item) {
          if (item.type === 'item' && item.value.data?.type === 'skill') {
            check.ref = item.value
            check.name = item.value.name
            check.type = 'skill'
            check.isSkill = true
            check.refSet = true
            check.score = item.value.value
          }
          if (item.type === 'characteristic') {
            check.ref = item.value
            check.name = item.value.label
            check.type = 'characteristic'
            check.isCharacteristic = true
            check.refSet = true
            check.score = item.value.value
          }
          if (item.type === 'attribute') {
            check.ref = item.value
            check.name = item.value.label
            check.type = 'attribute'
            check.isAttribute = true
            check.refSet = true
            check.score = item.value.value
          }
        }
      } else if (this.data.speedCheck?.name) {
        const item = this.actor.find(this.data.speedCheck.name)
        if (item) {
          if (item.type === 'item' && item.value.data?.type === 'skill') {
            check.ref = item.value
            check.name = item.value.name
            check.type = 'skill'
            check.isSkill = true
            check.refSet = true
            check.score = item.value.value
          }
          if (item.type === 'characteristic') {
            check.ref = item.value
            check.name = item.value.label
            check.type = 'characteristic'
            check.isCharacteristic = true
            check.refSet = true
            check.score = item.value.value
          }
          if (item.type === 'attribute') {
            check.ref = item.value
            check.name = item.value.label
            check.type = 'attribute'
            check.isAttribute = true
            check.refSet = true
            check.score = item.value.value
          }
        }
      }
    } else if (this.data.speedCheck?.id) {
      const item = game.items.get(this.data.speedCheck.id)
      if (item) {
        if (item.data?.type === 'skill') {
          check.ref = item
          check.name = item.name
          check.type = 'skill'
          check.isSkill = true
          check.refSet = false
          check.score = item.base
        }
      }
    }

    if (!check.rolled && !check.score) check.cssClasses += ' invalid'
    check.isValid = check.rolled && !isNaN(check.score)

    return check
  }
}
