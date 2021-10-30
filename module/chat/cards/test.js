//TO BE REMOVED FOR PROD
import { EnhancedChatCard } from '../../common/chatcardlib/src/chatcardlib.js'
export class testCard extends EnhancedChatCard {
  /**
   * Extend and override the default options
   * @returns {Object}
   */
  static get defaultOptions () {
    return mergeObject(super.defaultOptions, {
      template: 'systems/CoC7/templates/chat/cards/test.html'
    })
  }

  getData(){
    const data = super.getData()
    data.mySelectOptions = {
      0: 'option 1',
      1: 'option 2'
    }

    return data
  }

  // activateListeners (html) {
  //   super.activateListeners(html)
  // }
}
